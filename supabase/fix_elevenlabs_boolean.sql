-- Arreglar el tipo de datos del campo is_burst en elevenlabs_conversations
-- Debe ser BOOLEAN, no DECIMAL

ALTER TABLE public.elevenlabs_conversations 
  ALTER COLUMN is_burst TYPE BOOLEAN USING is_burst::text::boolean;
