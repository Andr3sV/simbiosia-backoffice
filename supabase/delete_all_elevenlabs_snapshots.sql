-- Eliminar todos los snapshots de ElevenLabs para regenerarlos desde cero
-- Este script borra TODOS los registros de la tabla elevenlabs_snapshots

DELETE FROM elevenlabs_snapshots;

-- Verificar que se borraron
SELECT COUNT(*) as snapshots_restantes FROM elevenlabs_snapshots;

