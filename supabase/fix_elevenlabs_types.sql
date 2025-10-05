-- Arreglar los tipos de datos en elevenlabs_conversations
-- Algunos campos que pensábamos eran números son en realidad objetos JSON

ALTER TABLE public.elevenlabs_conversations 
  ALTER COLUMN llm_usage TYPE JSONB USING llm_usage::text::jsonb;

-- También verificar si otros campos necesitan ser JSONB
-- (ejecutar solo si es necesario)
-- ALTER TABLE public.elevenlabs_conversations 
--   ALTER COLUMN dev_discount TYPE JSONB USING dev_discount::text::jsonb;
