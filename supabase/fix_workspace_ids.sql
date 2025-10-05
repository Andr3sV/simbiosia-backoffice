-- ========================================
-- CORRECCIÓN DE WORKSPACE IDs
-- Reasigna TODOS los workspace_id según el mapeo correcto
-- ========================================

BEGIN;

-- ========================================
-- PASO 1: Crear mapeo completo
-- ========================================

CREATE TEMP TABLE phone_workspace_map AS
SELECT 
  phone_number,
  workspace_id
FROM workspace_phones;

SELECT 'Mapeo creado con' as info, COUNT(*) as total_phones FROM phone_workspace_map;

-- ========================================
-- PASO 2: Actualizar TODOS los workspace_id en CALLS
-- ========================================

-- Primero actualizar los que coinciden con el mapeo
UPDATE calls c
SET workspace_id = pwm.workspace_id
FROM phone_workspace_map pwm
WHERE c.phone_from = pwm.phone_number
  AND c.source = 'twilio';

SELECT 'Calls actualizados con mapeo' as status;

-- Luego actualizar los que NO están en el mapeo → workspace 1
UPDATE calls
SET workspace_id = 1
WHERE source = 'twilio'
  AND phone_from NOT IN (SELECT phone_number FROM phone_workspace_map)
  AND workspace_id != 1;

SELECT 'Calls sin mapeo actualizados a workspace 1' as status;

-- Ver resultado
SELECT 'Distribución final en CALLS:' as info;
SELECT 
  workspace_id,
  COUNT(*) as total_calls
FROM calls
WHERE source = 'twilio'
GROUP BY workspace_id
ORDER BY workspace_id;

-- ========================================
-- PASO 3: Actualizar TODOS los workspace_id en ELEVENLABS_CONVERSATIONS
-- ========================================

-- Primero actualizar los que coinciden con el mapeo
UPDATE elevenlabs_conversations ec
SET workspace_id = pwm.workspace_id
FROM phone_workspace_map pwm
WHERE ec.agent_number = pwm.phone_number;

SELECT 'Conversaciones actualizadas con mapeo' as status;

-- Luego actualizar los que NO están en el mapeo → workspace 1
UPDATE elevenlabs_conversations
SET workspace_id = 1
WHERE agent_number IS NOT NULL
  AND agent_number NOT IN (SELECT phone_number FROM phone_workspace_map)
  AND workspace_id != 1;

SELECT 'Conversaciones sin mapeo actualizadas a workspace 1' as status;

-- Ver resultado
SELECT 'Distribución final en ELEVENLABS_CONVERSATIONS:' as info;
SELECT 
  workspace_id,
  COUNT(*) as total_conversations
FROM elevenlabs_conversations
GROUP BY workspace_id
ORDER BY workspace_id;

COMMIT;

SELECT '✅ WORKSPACE IDs CORREGIDOS' as status;
