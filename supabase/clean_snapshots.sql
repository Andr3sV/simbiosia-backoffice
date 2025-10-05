-- ========================================
-- LIMPIEZA DE SNAPSHOTS
-- Ejecutar primero para empezar limpio
-- ========================================

BEGIN;

TRUNCATE TABLE twilio_snapshots CASCADE;
TRUNCATE TABLE elevenlabs_snapshots CASCADE;

SELECT 'Snapshots limpiados' as status;
SELECT 'Twilio snapshots:' as info, COUNT(*) as total FROM twilio_snapshots;
SELECT 'ElevenLabs snapshots:' as info, COUNT(*) as total FROM elevenlabs_snapshots;

COMMIT;
