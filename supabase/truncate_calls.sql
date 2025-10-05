-- ========================================
-- LIMPIAR TABLA DE CALLS
-- ========================================

BEGIN;

TRUNCATE TABLE calls CASCADE;

SELECT '✅ Tabla calls vaciada completamente' as status;

-- Verificar
SELECT 'Llamadas restantes:' as info, COUNT(*) as total FROM calls;

COMMIT;
