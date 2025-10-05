-- ========================================
-- REORGANIZACIÓN DE WORKSPACES
-- ========================================
-- Este script reorganiza los workspaces según la nueva estructura

BEGIN;

-- ========================================
-- PASO 1: Limpiar workspace_phones
-- ========================================
TRUNCATE TABLE workspace_phones CASCADE;

-- ========================================
-- PASO 2: Insertar nueva configuración
-- ========================================

-- Workspace 4: Números principales (13 números)
INSERT INTO workspace_phones (workspace_id, phone_number, is_primary) VALUES
(4, '+34881193139', false),
(4, '+34930349258', false),
(4, '+34930349294', false),
(4, '+34930341942', false),
(4, '+34930343536', false),
(4, '+34911674282', false),
(4, '+34911676271', false),
(4, '+34911679636', false),
(4, '+34911679868', false),
(4, '+34881198794', false),
(4, '+34930341062', false),
(4, '+34930340228', true),
(4, '+34911677759', false);

-- Workspace 5: Números secundarios (3 números)
INSERT INTO workspace_phones (workspace_id, phone_number, is_primary) VALUES
(5, '+34911677200', true),
(5, '+34911670356', false),
(5, '+34930347962', false);

-- Workspace 6: Número USA (1 número)
INSERT INTO workspace_phones (workspace_id, phone_number, is_primary) VALUES
(6, '+13527475264', true);

-- ========================================
-- PASO 3: Crear mapeo de números a workspaces
-- ========================================

-- Tabla temporal con el mapeo
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

-- Ver mapeo
SELECT 'Mapeo de números a workspaces:' as info;
SELECT 
  new_workspace_id,
  COUNT(*) as phone_count,
  STRING_AGG(phone_number, ', ' ORDER BY phone_number) as phones
FROM workspace_mapping
GROUP BY new_workspace_id
ORDER BY new_workspace_id;

-- ========================================
-- PASO 4: Actualizar workspace_id en calls
-- ========================================

UPDATE calls c
SET workspace_id = wm.new_workspace_id
FROM workspace_mapping wm
WHERE c.phone_from = wm.phone_number
  AND c.source = 'twilio';

SELECT 'Calls actualizados' as info, COUNT(*) as total FROM calls;

-- ========================================
-- PASO 5: Actualizar workspace_id en elevenlabs_conversations
-- ========================================

UPDATE elevenlabs_conversations ec
SET workspace_id = wm.new_workspace_id
FROM workspace_mapping wm
WHERE ec.agent_number = wm.phone_number;

SELECT 'Conversaciones actualizadas' as info, COUNT(*) as total FROM elevenlabs_conversations;

-- ========================================
-- PASO 6: Limpiar y recalcular snapshots
-- ========================================

TRUNCATE TABLE twilio_snapshots CASCADE;
TRUNCATE TABLE elevenlabs_snapshots CASCADE;

-- Recalcular Twilio snapshots
INSERT INTO twilio_snapshots (workspace_id, snapshot_date, total_calls, total_cost, total_duration)
SELECT 
  workspace_id,
  DATE_TRUNC('hour', NOW()) as snapshot_date,
  COUNT(*) as total_calls,
  SUM(cost) as total_cost,
  SUM(duration) as total_duration
FROM calls
WHERE source = 'twilio'
GROUP BY workspace_id;

SELECT 'Twilio snapshots creados' as info, COUNT(*) as total FROM twilio_snapshots;

-- Recalcular ElevenLabs snapshots
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
  DATE_TRUNC('hour', NOW()) as snapshot_date,
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
GROUP BY workspace_id;

SELECT 'ElevenLabs snapshots creados' as info, COUNT(*) as total FROM elevenlabs_snapshots;

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
  AND phone_number NOT IN (SELECT phone_number FROM workspace_phones)
ON CONFLICT (phone_number) DO NOTHING;

-- ========================================
-- PASO 8: Actualizar nombres de workspaces
-- ========================================

UPDATE workspaces SET name = 'Workspace Principal', updated_at = NOW() WHERE id = 4;
UPDATE workspaces SET name = 'Workspace Secundario', updated_at = NOW() WHERE id = 5;
UPDATE workspaces SET name = 'Workspace USA', updated_at = NOW() WHERE id = 6;
UPDATE workspaces SET name = 'Otros Números', updated_at = NOW() WHERE id = 1;

-- ========================================
-- RESUMEN FINAL
-- ========================================

SELECT '===========================================' as separator;
SELECT 'RESUMEN DE REORGANIZACIÓN' as title;
SELECT '===========================================' as separator;

SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  COUNT(DISTINCT wp.phone_number) as phone_numbers,
  COALESCE(ts.total_calls, 0) as twilio_calls,
  COALESCE(ts.total_cost, 0) as twilio_cost,
  COALESCE(es.total_conversations, 0) as elevenlabs_conversations,
  COALESCE(es.total_cost, 0) as elevenlabs_cost
FROM workspaces w
LEFT JOIN workspace_phones wp ON w.id = wp.workspace_id
LEFT JOIN twilio_snapshots ts ON w.id = ts.workspace_id
LEFT JOIN elevenlabs_snapshots es ON w.id = es.workspace_id
WHERE w.id IN (1, 4, 5, 6)
GROUP BY w.id, w.name, ts.total_calls, ts.total_cost, es.total_conversations, es.total_cost
ORDER BY w.id;

SELECT '===========================================' as separator;
SELECT 'Reorganización completada exitosamente!' as status;
SELECT '===========================================' as separator;

COMMIT;

-- Si algo sale mal durante la ejecución, ejecuta: ROLLBACK;
