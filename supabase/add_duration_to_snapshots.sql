-- Agregar columna de duración total de Twilio a call_snapshots
ALTER TABLE public.call_snapshots 
  ADD COLUMN IF NOT EXISTS twilio_total_duration INTEGER DEFAULT 0;

-- Agregar columna de duración total de ElevenLabs (si la necesitas)
ALTER TABLE public.call_snapshots 
  ADD COLUMN IF NOT EXISTS elevenlabs_total_duration INTEGER DEFAULT 0;
