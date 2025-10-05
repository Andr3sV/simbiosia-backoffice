-- ========================================
-- PASO 3: CREAR ELEVENLABS SNAPSHOTS (agrupados por HORA y WORKSPACE)
-- ========================================

BEGIN;

-- Limpiar snapshots de ElevenLabs
TRUNCATE TABLE elevenlabs_snapshots CASCADE;

SELECT 'Iniciando creación de ElevenLabs snapshots...' as status;

-- Verificar cuántas conversaciones tenemos
SELECT 'Total conversaciones ElevenLabs:' as info, COUNT(*) as total 
FROM elevenlabs_conversations 
WHERE workspace_id IS NOT NULL AND conversation_date IS NOT NULL;

-- Crear snapshots agrupados por hora y workspace
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

SELECT 'ElevenLabs snapshots creados' as status;
SELECT 'Total snapshots:' as info, COUNT(*) as total FROM elevenlabs_snapshots;

-- Resumen por workspace
SELECT 'Resumen por workspace:' as info;
SELECT 
  workspace_id,
  COUNT(*) as total_snapshots,
  SUM(total_conversations) as total_conversations,
  SUM(total_cost) as total_cost
FROM elevenlabs_snapshots
GROUP BY workspace_id
ORDER BY workspace_id;

COMMIT;

SELECT '✅ PASO 3 COMPLETADO' as status;
