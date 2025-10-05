-- ========================================
-- PASO 1: PREPARACIÓN
-- Agregar columna real_minutes y crear mapeo temporal
-- ========================================

BEGIN;

-- Agregar columna real_minutes
ALTER TABLE twilio_snapshots 
ADD COLUMN IF NOT EXISTS real_minutes INTEGER DEFAULT 0;

SELECT 'Columna real_minutes agregada' as status;

-- Crear mapeo temporal de números a workspaces
CREATE TEMP TABLE workspace_mapping AS
WITH phone_to_new_workspace AS (
  SELECT phone_number, workspace_id as new_workspace_id
  FROM workspace_phones
),
all_phones AS (
  SELECT DISTINCT phone_from as phone_number
  FROM calls
  WHERE source = 'twilio'
  UNION
  SELECT DISTINCT agent_number as phone_number
  FROM elevenlabs_conversations
  WHERE agent_number IS NOT NULL
)
SELECT 
  ap.phone_number,
  COALESCE(pnw.new_workspace_id, 1) as new_workspace_id
FROM all_phones ap
LEFT JOIN phone_to_new_workspace pnw ON ap.phone_number = pnw.phone_number;

SELECT 'Mapeo temporal creado' as status;
SELECT 'Total teléfonos mapeados:' as info, COUNT(*) as total FROM workspace_mapping;

SELECT 'Distribución por workspace:' as info;
SELECT 
  new_workspace_id,
  COUNT(*) as phone_count
FROM workspace_mapping
GROUP BY new_workspace_id
ORDER BY new_workspace_id;

COMMIT;

SELECT '✅ PASO 1 COMPLETADO' as status;
