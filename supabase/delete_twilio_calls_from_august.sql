-- Eliminar solo las llamadas de Twilio desde agosto 1 para re-sincronizar
-- Esto NO afecta las llamadas de ElevenLabs

DELETE FROM calls 
WHERE source = 'twilio' 
  AND call_date >= '2025-08-01';

-- Verificar cuántas quedaron
SELECT 
  source,
  COUNT(*) as total,
  MIN(call_date) as primera,
  MAX(call_date) as ultima
FROM calls
GROUP BY source;
