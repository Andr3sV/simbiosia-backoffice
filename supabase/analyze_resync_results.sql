-- Análisis de Resultados de Resincronización de Twilio
-- Ejecutar en Supabase SQL Editor

-- 1. DISTRIBUCIÓN DE LLAMADAS POR WORKSPACE
SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  COUNT(c.id) as total_calls,
  SUM(c.cost) as total_cost,
  SUM(c.duration) as total_duration_seconds,
  ROUND(SUM(c.duration)::numeric / 3600, 2) as total_duration_hours,
  COUNT(CASE WHEN c.raw_data->>'direction' = 'outbound-api' THEN 1 END) as outbound_api_calls,
  COUNT(CASE WHEN c.raw_data->>'direction' = 'trunking-terminating' THEN 1 END) as trunking_terminating_calls,
  COUNT(CASE WHEN c.raw_data->>'direction' = 'trunking-originating' THEN 1 END) as trunking_originating_calls,
  MIN(c.call_date) as first_call,
  MAX(c.call_date) as last_call
FROM workspaces w
LEFT JOIN calls c ON c.workspace_id = w.id 
  AND c.source = 'twilio'
  AND c.call_date >= '2025-08-01'
GROUP BY w.id, w.name
ORDER BY total_calls DESC NULLS LAST;

-- 2. RESUMEN GENERAL
SELECT 
  COUNT(*) as total_calls,
  COUNT(DISTINCT workspace_id) as total_workspaces,
  SUM(cost) as total_cost,
  SUM(duration) as total_duration_seconds,
  ROUND(SUM(duration)::numeric / 3600, 2) as total_duration_hours,
  COUNT(CASE WHEN raw_data->>'direction' = 'outbound-api' THEN 1 END) as case1_outbound_api,
  COUNT(CASE WHEN raw_data->>'direction' = 'trunking-terminating' THEN 1 END) as case2_trunking_terminating,
  COUNT(CASE WHEN raw_data->>'direction' = 'trunking-originating' THEN 1 END) as case3_trunking_originating,
  MIN(call_date) as first_call_date,
  MAX(call_date) as last_call_date
FROM calls
WHERE source = 'twilio'
  AND call_date >= '2025-08-01';

-- 3. NÚMEROS DE WORKSPACE CREADOS RECIENTEMENTE
SELECT 
  wp.id,
  wp.workspace_id,
  wp.phone_number,
  wp.is_primary,
  wp.created_at,
  w.name as workspace_name,
  COUNT(c.id) as calls_count
FROM workspace_phones wp
LEFT JOIN workspaces w ON w.id = wp.workspace_id
LEFT JOIN calls c ON c.phone_from = wp.phone_number 
  AND c.source = 'twilio' 
  AND c.call_date >= '2025-08-01'
WHERE wp.created_at >= NOW() - INTERVAL '1 hour'
GROUP BY wp.id, wp.workspace_id, wp.phone_number, wp.is_primary, wp.created_at, w.name
ORDER BY wp.created_at DESC;

-- 4. TOP 10 WORKSPACES POR VOLUMEN DE LLAMADAS
SELECT 
  w.id,
  w.name,
  COUNT(c.id) as total_calls,
  ROUND(SUM(c.cost)::numeric, 2) as total_cost_usd,
  ROUND(SUM(c.duration)::numeric / 3600, 2) as total_hours
FROM workspaces w
JOIN calls c ON c.workspace_id = w.id
WHERE c.source = 'twilio'
  AND c.call_date >= '2025-08-01'
GROUP BY w.id, w.name
ORDER BY total_calls DESC
LIMIT 10;

-- 5. DISTRIBUCIÓN POR TIPO DE LLAMADA Y WORKSPACE
SELECT 
  w.id,
  w.name,
  c.raw_data->>'direction' as call_type,
  COUNT(*) as count,
  ROUND(SUM(c.cost)::numeric, 2) as total_cost
FROM workspaces w
JOIN calls c ON c.workspace_id = w.id
WHERE c.source = 'twilio'
  AND c.call_date >= '2025-08-01'
GROUP BY w.id, w.name, c.raw_data->>'direction'
ORDER BY w.id, count DESC;

-- 6. VERIFICAR LLAMADAS SIN WORKSPACE ASIGNADO (deberían estar en workspace 1)
SELECT 
  workspace_id,
  COUNT(*) as calls_count,
  raw_data->>'direction' as direction,
  COUNT(DISTINCT phone_from) as unique_from_numbers
FROM calls
WHERE source = 'twilio'
  AND call_date >= '2025-08-01'
  AND workspace_id = 1
GROUP BY workspace_id, raw_data->>'direction'
ORDER BY calls_count DESC;
