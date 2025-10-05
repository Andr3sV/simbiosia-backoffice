-- ========================================
-- VERIFICACIÓN DE WORKSPACE IDs
-- ========================================

-- Ver qué workspace_ids existen en calls
SELECT 'Workspace IDs en CALLS:' as info;
SELECT 
  workspace_id,
  COUNT(*) as total_calls,
  COUNT(DISTINCT phone_from) as unique_phones
FROM calls
WHERE source = 'twilio'
GROUP BY workspace_id
ORDER BY workspace_id;

-- Ver qué workspace_ids existen en elevenlabs_conversations
SELECT 'Workspace IDs en ELEVENLABS_CONVERSATIONS:' as info;
SELECT 
  workspace_id,
  COUNT(*) as total_conversations,
  COUNT(DISTINCT agent_number) as unique_phones
FROM elevenlabs_conversations
GROUP BY workspace_id
ORDER BY workspace_id;

-- Ver números en calls que NO están en workspace_phones
SELECT 'Teléfonos en CALLS sin mapear:' as info;
SELECT DISTINCT 
  c.phone_from,
  c.workspace_id,
  COUNT(*) as call_count
FROM calls c
WHERE c.source = 'twilio'
  AND c.phone_from NOT IN (SELECT phone_number FROM workspace_phones)
GROUP BY c.phone_from, c.workspace_id
ORDER BY call_count DESC
LIMIT 20;

-- Ver números en elevenlabs que NO están en workspace_phones
SELECT 'Teléfonos en ELEVENLABS sin mapear:' as info;
SELECT DISTINCT 
  ec.agent_number,
  ec.workspace_id,
  COUNT(*) as conversation_count
FROM elevenlabs_conversations ec
WHERE ec.agent_number NOT IN (SELECT phone_number FROM workspace_phones)
  AND ec.agent_number IS NOT NULL
GROUP BY ec.agent_number, ec.workspace_id
ORDER BY conversation_count DESC
LIMIT 20;
