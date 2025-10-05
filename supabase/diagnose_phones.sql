-- ========================================
-- DIAGNÓSTICO DETALLADO DE NÚMEROS
-- ========================================

-- Ver todos los números que están en workspace_phones
SELECT '=== NÚMEROS EN WORKSPACE_PHONES ===' as info;
SELECT 
  workspace_id,
  phone_number,
  is_primary
FROM workspace_phones
ORDER BY workspace_id, phone_number;

-- Ver ejemplos de números en calls
SELECT '=== EJEMPLOS DE NÚMEROS EN CALLS ===' as info;
SELECT DISTINCT
  phone_from,
  workspace_id,
  COUNT(*) as call_count
FROM calls
WHERE source = 'twilio'
GROUP BY phone_from, workspace_id
ORDER BY call_count DESC
LIMIT 30;

-- Ver ejemplos de números en elevenlabs_conversations
SELECT '=== EJEMPLOS DE NÚMEROS EN ELEVENLABS ===' as info;
SELECT DISTINCT
  agent_number,
  workspace_id,
  COUNT(*) as conversation_count
FROM elevenlabs_conversations
WHERE agent_number IS NOT NULL
GROUP BY agent_number, workspace_id
ORDER BY conversation_count DESC
LIMIT 30;

-- Ver cuántos números de calls están en workspace_phones
SELECT '=== MATCH ENTRE CALLS Y WORKSPACE_PHONES ===' as info;
SELECT 
  'En calls pero NO en workspace_phones' as status,
  COUNT(DISTINCT phone_from) as total
FROM calls
WHERE source = 'twilio'
  AND phone_from NOT IN (SELECT phone_number FROM workspace_phones);

SELECT 
  'En workspace_phones pero NO en calls' as status,
  COUNT(*) as total
FROM workspace_phones
WHERE phone_number NOT IN (SELECT DISTINCT phone_from FROM calls WHERE source = 'twilio');
