-- Script para limpiar todos los datos y empezar de cero

-- 1. Eliminar todas las llamadas
DELETE FROM calls;

-- 2. Eliminar todos los snapshots
DELETE FROM call_snapshots;

-- 3. Eliminar todos los números de workspace
DELETE FROM workspace_phones;

-- 4. Eliminar todos los workspaces
DELETE FROM workspaces;

-- 5. Resetear las secuencias para que los IDs empiecen de 1
ALTER SEQUENCE workspaces_id_seq RESTART WITH 1;
ALTER SEQUENCE call_snapshots_id_seq RESTART WITH 1;
ALTER SEQUENCE workspace_phones_id_seq RESTART WITH 1;

-- Verificar que todo esté limpio
SELECT 'workspaces' as tabla, COUNT(*) as registros FROM workspaces
UNION ALL
SELECT 'workspace_phones', COUNT(*) FROM workspace_phones
UNION ALL
SELECT 'call_snapshots', COUNT(*) FROM call_snapshots
UNION ALL
SELECT 'calls', COUNT(*) FROM calls;
