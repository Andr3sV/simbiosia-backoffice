-- Buscar llamadas con el número +34648728251 en phone_to

-- 1. Conteo general
SELECT 
  COUNT(*) as total_calls,
  COUNT(DISTINCT workspace_id) as workspaces,
  raw_data->>'direction' as direction,
  COUNT(*) as count_by_direction
FROM calls
WHERE phone_to LIKE '%34648728251%'
  AND source = 'twilio'
  AND call_date >= '2025-08-01'
GROUP BY raw_data->>'direction'
ORDER BY count_by_direction DESC;

-- 2. Detalles de las llamadas
SELECT 
  id as call_sid,
  workspace_id,
  phone_from,
  phone_to,
  raw_data->>'direction' as direction,
  duration,
  cost,
  status,
  call_date,
  created_at
FROM calls
WHERE phone_to LIKE '%34648728251%'
  AND source = 'twilio'
  AND call_date >= '2025-08-01'
ORDER BY call_date DESC;

-- 3. Ver workspace asociado
SELECT 
  c.id as call_sid,
  c.workspace_id,
  w.name as workspace_name,
  c.phone_from,
  c.phone_to,
  c.raw_data->>'direction' as direction,
  c.call_date
FROM calls c
LEFT JOIN workspaces w ON w.id = c.workspace_id
WHERE c.phone_to LIKE '%34648728251%'
  AND c.source = 'twilio'
  AND c.call_date >= '2025-08-01'
ORDER BY c.call_date DESC;

-- 4. Buscar también en phone_from (para ver si es un número de workspace)
SELECT 
  'Como FROM' as tipo,
  COUNT(*) as cantidad,
  raw_data->>'direction' as direction
FROM calls
WHERE phone_from LIKE '%34648728251%'
  AND source = 'twilio'
  AND call_date >= '2025-08-01'
GROUP BY raw_data->>'direction'
UNION ALL
SELECT 
  'Como TO' as tipo,
  COUNT(*) as cantidad,
  raw_data->>'direction' as direction
FROM calls
WHERE phone_to LIKE '%34648728251%'
  AND source = 'twilio'
  AND call_date >= '2025-08-01'
GROUP BY raw_data->>'direction';
