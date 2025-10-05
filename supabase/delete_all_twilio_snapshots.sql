-- Eliminar todos los snapshots de Twilio para regenerarlos desde cero
-- Este script borra TODOS los registros de la tabla twilio_snapshots

DELETE FROM twilio_snapshots;

-- Verificar que se borraron
SELECT COUNT(*) as snapshots_restantes FROM twilio_snapshots;

