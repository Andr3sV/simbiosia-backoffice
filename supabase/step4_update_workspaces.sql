-- ========================================
-- PASO 4: ACTUALIZAR NOMBRES DE WORKSPACES Y RESUMEN FINAL
-- ========================================

BEGIN;

-- Actualizar nombres de workspaces
UPDATE workspaces SET name = 'Workspace Principal', updated_at = NOW() WHERE id = 4;
UPDATE workspaces SET name = 'Workspace Secundario', updated_at = NOW() WHERE id = 5;
UPDATE workspaces SET name = 'Workspace USA', updated_at = NOW() WHERE id = 6;
UPDATE workspaces SET name = 'Otros Números', updated_at = NOW() WHERE id = 1;

SELECT 'Nombres de workspaces actualizados' as status;

-- Resumen final completo
SELECT '===========================================' as separator;
SELECT 'RESUMEN FINAL DE REORGANIZACIÓN' as title;
SELECT '===========================================' as separator;

SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  COUNT(DISTINCT wp.phone_number) as phone_numbers,
  COALESCE(SUM(ts.total_calls), 0) as twilio_calls,
  COALESCE(SUM(ts.total_cost), 0) as twilio_cost,
  COALESCE(SUM(ts.real_minutes), 0) as twilio_real_minutes,
  COALESCE(SUM(es.total_conversations), 0) as elevenlabs_conversations,
  COALESCE(SUM(es.total_cost), 0) as elevenlabs_cost
FROM workspaces w
LEFT JOIN workspace_phones wp ON w.id = wp.workspace_id
LEFT JOIN twilio_snapshots ts ON w.id = ts.workspace_id
LEFT JOIN elevenlabs_snapshots es ON w.id = es.workspace_id
WHERE w.id IN (1, 4, 5, 6)
GROUP BY w.id, w.name
ORDER BY w.id;

SELECT '===========================================' as separator;

COMMIT;

SELECT '✅ REORGANIZACIÓN COMPLETADA EXITOSAMENTE' as status;
SELECT 'Snapshots agrupados por HORA y WORKSPACE' as detail;
