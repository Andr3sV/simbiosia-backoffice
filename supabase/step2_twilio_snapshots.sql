-- ========================================
-- PASO 2: CREAR TWILIO SNAPSHOTS (agrupados por HORA y WORKSPACE)
-- ========================================
-- IMPORTANTE: Ejecutar DESPUÉS del step1_prepare.sql

BEGIN;

-- Limpiar snapshots de Twilio
TRUNCATE TABLE twilio_snapshots CASCADE;

SELECT 'Iniciando creación de Twilio snapshots...' as status;

-- Verificar cuántas llamadas tenemos
SELECT 'Total llamadas Twilio:' as info, COUNT(*) as total 
FROM calls 
WHERE source = 'twilio' AND call_date IS NOT NULL;

-- Crear snapshots agrupados por hora y workspace
INSERT INTO twilio_snapshots (
  workspace_id, 
  snapshot_date, 
  total_calls, 
  total_cost, 
  total_duration,
  real_minutes
)
SELECT 
  workspace_id,
  DATE_TRUNC('hour', call_date) as snapshot_date,
  COUNT(*) as total_calls,
  SUM(cost) as total_cost,
  SUM(duration) as total_duration,
  SUM(
    CASE 
      WHEN duration >= 1 THEN CEILING(duration::numeric / 60.0)
      ELSE 0
    END
  )::INTEGER as real_minutes
FROM calls
WHERE source = 'twilio'
  AND call_date IS NOT NULL
GROUP BY workspace_id, DATE_TRUNC('hour', call_date)
ORDER BY workspace_id, DATE_TRUNC('hour', call_date);

SELECT 'Twilio snapshots creados' as status;
SELECT 'Total snapshots:' as info, COUNT(*) as total FROM twilio_snapshots;

-- Resumen por workspace
SELECT 'Resumen por workspace:' as info;
SELECT 
  workspace_id,
  COUNT(*) as total_snapshots,
  SUM(total_calls) as total_calls,
  SUM(total_cost) as total_cost,
  SUM(real_minutes) as total_real_minutes
FROM twilio_snapshots
GROUP BY workspace_id
ORDER BY workspace_id;

COMMIT;

SELECT '✅ PASO 2 COMPLETADO' as status;
