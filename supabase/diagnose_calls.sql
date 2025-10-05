-- ========================================
-- DIAGNÓSTICO DE LLAMADAS
-- ========================================

-- Ver total de llamadas
SELECT 'Total de llamadas Twilio:' as info, COUNT(*) as total 
FROM calls 
WHERE source = 'twilio';

-- Ver cuántas llamadas tienen phone_from en workspace_phones
SELECT 'Llamadas con phone_from en workspace_phones:' as info, COUNT(*) as total
FROM calls
WHERE source = 'twilio'
  AND phone_from IN (SELECT phone_number FROM workspace_phones);

-- Ver cuántas llamadas NO tienen phone_from en workspace_phones
SELECT 'Llamadas con phone_from NO en workspace_phones:' as info, COUNT(*) as total
FROM calls
WHERE source = 'twilio'
  AND phone_from NOT IN (SELECT phone_number FROM workspace_phones);

-- Ver ejemplos de raw_data para entender la estructura
SELECT 'Ejemplos de raw_data (primeras 5 llamadas):' as info;
SELECT 
  id,
  phone_from,
  phone_to,
  (raw_data->>'direction') as direction,
  raw_data
FROM calls
WHERE source = 'twilio'
LIMIT 5;
