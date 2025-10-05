-- ========================================
-- REORGANIZACIÓN DE WORKSPACES - PARTE 2
-- Ejecutar DESPUÉS de completar pasos 1-5
-- ========================================

BEGIN;

-- ========================================
-- PASO 0: Recrear tabla temporal workspace_mapping
-- ========================================

-- Necesitamos recrear el mapeo de números a workspaces
CREATE TEMP TABLE workspace_mapping AS
WITH phone_to_new_workspace AS (
  SELECT phone_number, workspace_id as new_workspace_id
  FROM workspace_phones
),
all_phones AS (
  -- Números de Twilio
  SELECT DISTINCT phone_from as phone_number
  FROM calls
  WHERE source = 'twilio'
  UNION
  -- Números de ElevenLabs
  SELECT DISTINCT agent_number as phone_number
  FROM elevenlabs_conversations
  WHERE agent_number IS NOT NULL
)
SELECT 
  ap.phone_number,
  COALESCE(pnw.new_workspace_id, 1) as new_workspace_id
FROM all_phones ap
LEFT JOIN phone_to_new_workspace pnw ON ap.phone_number = pnw.phone_number;

SELECT 'Mapeo temporal recreado' as info, COUNT(*) as total_phones FROM workspace_mapping;

-- ========================================
-- PASO 6A: Agregar columna real_minutes a twilio_snapshots
-- ========================================

ALTER TABLE twilio_snapshots 
ADD COLUMN IF NOT EXISTS real_minutes INTEGER DEFAULT 0;

-- ========================================
-- PASO 6B: Limpiar snapshots antiguos
-- ========================================

TRUNCATE TABLE twilio_snapshots CASCADE;
TRUNCATE TABLE elevenlabs_snapshots CASCADE;

-- ========================================
-- PASO 6C: Recalcular Twilio snapshots (agrupados por HORA y WORKSPACE)
-- ========================================

-- Explicación del cálculo de real_minutes:
-- - Si duration >= 1 segundo -> cuenta como 1 minuto
-- - Cada 60 segundos adicionales -> otro minuto
-- - Usamos CEILING(duration / 60.0) para redondear hacia arriba
-- - Ejemplo: 1 segundo = 1 minuto, 61 segundos = 2 minutos, 121 segundos = 3 minutos

INSERT INTO twilio_snapshots (
  workspace_id, 
  snapshot_date, 
  total_calls, 
  total_cost, 
  total_duration,
  real_minutes
)
SELECT 
  workspace_id,
  DATE_TRUNC('hour', call_date) as snapshot_date,
  COUNT(*) as total_calls,
  SUM(cost) as total_cost,
  SUM(duration) as total_duration,
  SUM(
    CASE 
      WHEN duration >= 1 THEN CEILING(duration::numeric / 60.0)
      ELSE 0
    END
  )::INTEGER as real_minutes
FROM calls
WHERE source = 'twilio'
  AND call_date IS NOT NULL
GROUP BY workspace_id, DATE_TRUNC('hour', call_date)
ORDER BY workspace_id, DATE_TRUNC('hour', call_date);

SELECT 'Twilio snapshots creados (por hora y workspace)' as info, COUNT(*) as total_snapshots FROM twilio_snapshots;

-- Ver resumen de minutos reales por workspace
SELECT 
  workspace_id,
  COUNT(*) as total_snapshots,
  SUM(total_calls) as total_calls,
  SUM(total_duration) as total_seconds,
  SUM(real_minutes) as total_real_minutes,
  ROUND(SUM(total_duration)::numeric / 60.0, 2) as theoretical_minutes,
  ROUND((SUM(real_minutes) - SUM(total_duration)::numeric / 60.0)::numeric, 2) as extra_minutes_charged
FROM twilio_snapshots
GROUP BY workspace_id
ORDER BY workspace_id;

-- ========================================
-- PASO 6D: Recalcular ElevenLabs snapshots (agrupados por HORA y WORKSPACE)
-- ========================================

INSERT INTO elevenlabs_snapshots (
  workspace_id, 
  snapshot_date, 
  total_conversations, 
  total_cost, 
  total_duration,
  llm_price,
  llm_charge,
  call_charge,
  free_minutes_consumed,
  free_llm_dollars_consumed,
  dev_discount
)
SELECT 
  workspace_id,
  DATE_TRUNC('hour', conversation_date) as snapshot_date,
  COUNT(*) as total_conversations,
  SUM(cost) as total_cost,
  SUM(call_duration_secs) as total_duration,
  SUM(llm_price) as llm_price,
  SUM(llm_charge) as llm_charge,
  SUM(call_charge) as call_charge,
  SUM(free_minutes_consumed) as free_minutes_consumed,
  SUM(free_llm_dollars_consumed) as free_llm_dollars_consumed,
  SUM(dev_discount) as dev_discount
FROM elevenlabs_conversations
WHERE workspace_id IS NOT NULL
  AND conversation_date IS NOT NULL
GROUP BY workspace_id, DATE_TRUNC('hour', conversation_date)
ORDER BY workspace_id, DATE_TRUNC('hour', conversation_date);

SELECT 'ElevenLabs snapshots creados (por hora y workspace)' as info, COUNT(*) as total_snapshots FROM elevenlabs_snapshots;

-- Ver resumen por workspace
SELECT 
  workspace_id,
  COUNT(*) as total_snapshots,
  SUM(total_conversations) as total_conversations,
  SUM(total_cost) as total_cost
FROM elevenlabs_snapshots
GROUP BY workspace_id
ORDER BY workspace_id;

-- ========================================
-- PASO 7: Agregar números no asignados a workspace 1
-- ========================================

INSERT INTO workspace_phones (workspace_id, phone_number, is_primary)
SELECT DISTINCT 
  1 as workspace_id,
  phone_number,
  false as is_primary
FROM workspace_mapping
WHERE new_workspace_id = 1
  AND phone_number NOT IN (SELECT phone_number FROM workspace_phones);

SELECT 'Números agregados a workspace 1' as info, COUNT(*) as total 
FROM workspace_phones WHERE workspace_id = 1;

-- ========================================
-- PASO 8: Actualizar nombres de workspaces
-- ========================================

UPDATE workspaces SET name = 'Workspace Principal', updated_at = NOW() WHERE id = 4;
UPDATE workspaces SET name = 'Workspace Secundario', updated_at = NOW() WHERE id = 5;
UPDATE workspaces SET name = 'Workspace USA', updated_at = NOW() WHERE id = 6;
UPDATE workspaces SET name = 'Otros Números', updated_at = NOW() WHERE id = 1;

-- ========================================
-- RESUMEN FINAL COMPLETO
-- ========================================

SELECT '===========================================' as separator;
SELECT 'RESUMEN DE REORGANIZACIÓN COMPLETO' as title;
SELECT '===========================================' as separator;

-- Resumen por workspace
SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  COUNT(DISTINCT wp.phone_number) as phone_numbers,
  COALESCE(SUM(ts.total_calls), 0) as twilio_calls,
  COALESCE(SUM(ts.total_cost), 0) as twilio_cost,
  COALESCE(SUM(ts.real_minutes), 0) as twilio_real_minutes,
  COALESCE(SUM(es.total_conversations), 0) as elevenlabs_conversations,
  COALESCE(SUM(es.total_cost), 0) as elevenlabs_cost
FROM workspaces w
LEFT JOIN workspace_phones wp ON w.id = wp.workspace_id
LEFT JOIN twilio_snapshots ts ON w.id = ts.workspace_id
LEFT JOIN elevenlabs_snapshots es ON w.id = es.workspace_id
WHERE w.id IN (1, 4, 5, 6)
GROUP BY w.id, w.name
ORDER BY w.id;

SELECT '===========================================' as separator;

-- Ejemplo de datos recientes (últimas 24 horas de Twilio)
SELECT 
  workspace_id,
  snapshot_date,
  total_calls,
  total_cost,
  real_minutes,
  ROUND(total_duration::numeric / 60.0, 2) as theoretical_minutes
FROM twilio_snapshots
WHERE snapshot_date >= NOW() - INTERVAL '24 hours'
ORDER BY workspace_id, snapshot_date DESC
LIMIT 20;

SELECT '===========================================' as separator;
SELECT 'Reorganización completada exitosamente!' as status;
SELECT 'Snapshots agrupados por HORA y WORKSPACE con minutos reales calculados' as detail;
SELECT '===========================================' as separator;

COMMIT;

-- Si algo sale mal durante la ejecución, ejecuta: ROLLBACK;
