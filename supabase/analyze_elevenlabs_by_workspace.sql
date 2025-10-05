-- Análisis de conversaciones de ElevenLabs por workspace
-- Este script analiza la distribución y estadísticas de las conversaciones de ElevenLabs

-- 1. Distribución de conversaciones por workspace
SELECT 
    workspace_id,
    COUNT(*) as total_conversations,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_conversations,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_conversations,
    COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_conversations,
    ROUND(AVG(call_duration_secs), 2) as avg_duration_seconds,
    ROUND(SUM(cost), 4) as total_cost,
    ROUND(SUM(call_charge), 4) as total_call_charge,
    ROUND(SUM(llm_charge), 4) as total_llm_charge,
    MIN(conversation_date) as first_conversation,
    MAX(conversation_date) as last_conversation
FROM elevenlabs_conversations
GROUP BY workspace_id
ORDER BY total_conversations DESC;

-- 2. Top 10 workspaces con más conversaciones
SELECT 
    workspace_id,
    COUNT(*) as total_conversations,
    ROUND(SUM(cost), 4) as total_cost,
    ROUND(AVG(call_duration_secs), 2) as avg_duration
FROM elevenlabs_conversations
GROUP BY workspace_id
ORDER BY total_conversations DESC
LIMIT 10;

-- 3. Conversaciones sin workspace asignado
SELECT 
    COUNT(*) as conversations_without_workspace,
    ROUND(SUM(cost), 4) as total_cost_without_workspace
FROM elevenlabs_conversations
WHERE workspace_id IS NULL;

-- 4. Estadísticas por agente (agent_id)
SELECT 
    agent_id,
    workspace_id,
    COUNT(*) as conversations,
    ROUND(SUM(cost), 4) as total_cost,
    ROUND(AVG(call_duration_secs), 2) as avg_duration
FROM elevenlabs_conversations
WHERE workspace_id IS NOT NULL
GROUP BY agent_id, workspace_id
ORDER BY conversations DESC
LIMIT 20;

-- 5. Conversaciones por fecha (últimos 30 días)
SELECT 
    DATE(conversation_date) as date,
    COUNT(*) as conversations,
    ROUND(SUM(cost), 4) as total_cost
FROM elevenlabs_conversations
WHERE conversation_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(conversation_date)
ORDER BY date DESC;

-- 6. Resumen general
SELECT 
    'Total Conversations' as metric,
    COUNT(*) as value
FROM elevenlabs_conversations
UNION ALL
SELECT 
    'Conversations with Workspace',
    COUNT(*)
FROM elevenlabs_conversations
WHERE workspace_id IS NOT NULL
UNION ALL
SELECT 
    'Conversations without Workspace',
    COUNT(*)
FROM elevenlabs_conversations
WHERE workspace_id IS NULL
UNION ALL
SELECT 
    'Total Cost',
    ROUND(SUM(cost), 4)
FROM elevenlabs_conversations
UNION ALL
SELECT 
    'Average Duration (seconds)',
    ROUND(AVG(call_duration_secs), 2)
FROM elevenlabs_conversations;
