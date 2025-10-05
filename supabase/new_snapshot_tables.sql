-- Eliminar la tabla antigua de snapshots combinados
DROP TABLE IF EXISTS public.call_snapshots CASCADE;

-- Tabla de snapshots para Twilio
CREATE TABLE IF NOT EXISTS public.twilio_snapshots (
  id BIGSERIAL PRIMARY KEY,
  workspace_id BIGINT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  snapshot_date TIMESTAMPTZ NOT NULL,
  total_calls INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 4) DEFAULT 0,
  total_duration INTEGER DEFAULT 0, -- en segundos
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índice único para evitar duplicados por workspace y hora
  UNIQUE(workspace_id, snapshot_date)
);

-- Tabla de snapshots para ElevenLabs
CREATE TABLE IF NOT EXISTS public.elevenlabs_snapshots (
  id BIGSERIAL PRIMARY KEY,
  workspace_id BIGINT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  snapshot_date TIMESTAMPTZ NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 4) DEFAULT 0,
  total_duration INTEGER DEFAULT 0, -- en segundos
  
  -- Métricas específicas de ElevenLabs
  llm_usage JSONB,
  llm_price DECIMAL(10, 4) DEFAULT 0,
  llm_charge DECIMAL(10, 4) DEFAULT 0,
  call_charge DECIMAL(10, 4) DEFAULT 0,
  free_minutes_consumed DECIMAL(10, 4) DEFAULT 0,
  free_llm_dollars_consumed DECIMAL(10, 4) DEFAULT 0,
  dev_discount DECIMAL(10, 4) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Índice único para evitar duplicados por workspace y hora
  UNIQUE(workspace_id, snapshot_date)
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_twilio_snapshots_workspace ON public.twilio_snapshots(workspace_id);
CREATE INDEX IF NOT EXISTS idx_twilio_snapshots_date ON public.twilio_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_elevenlabs_snapshots_workspace ON public.elevenlabs_snapshots(workspace_id);
CREATE INDEX IF NOT EXISTS idx_elevenlabs_snapshots_date ON public.elevenlabs_snapshots(snapshot_date DESC);

-- Row Level Security
ALTER TABLE public.twilio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elevenlabs_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON public.twilio_snapshots FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.elevenlabs_snapshots FOR ALL USING (true);
