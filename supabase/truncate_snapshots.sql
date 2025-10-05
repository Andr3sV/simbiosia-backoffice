-- ========================================
-- LIMPIAR TABLAS DE SNAPSHOTS
-- ========================================

BEGIN;

TRUNCATE TABLE twilio_snapshots CASCADE;
TRUNCATE TABLE elevenlabs_snapshots CASCADE;

SELECT '✅ Tablas de snapshots vaciadas completamente' as status;

-- Verificar
SELECT 'Twilio snapshots restantes:' as info, COUNT(*) as total FROM twilio_snapshots;
SELECT 'ElevenLabs snapshots restantes:' as info, COUNT(*) as total FROM elevenlabs_snapshots;

COMMIT;
