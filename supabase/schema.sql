-- Schema para el backoffice de Simbiosia

-- Tabla de workspaces
CREATE TABLE IF NOT EXISTS workspaces (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de snapshots de datos (guardamos histórico cada 12 horas)
CREATE TABLE IF NOT EXISTS call_snapshots (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  snapshot_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Datos de Twilio
  twilio_total_calls INTEGER DEFAULT 0,
  twilio_total_cost DECIMAL(10, 4) DEFAULT 0,
  twilio_raw_data JSONB,
  
  -- Datos de ElevenLabs
  elevenlabs_total_calls INTEGER DEFAULT 0,
  elevenlabs_total_cost DECIMAL(10, 4) DEFAULT 0,
  elevenlabs_raw_data JSONB,
  
  -- Totales combinados
  combined_total_calls INTEGER DEFAULT 0,
  combined_total_cost DECIMAL(10, 4) DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla detallada de llamadas individuales (opcional, para análisis profundo)
CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY, -- SID de Twilio o ID de ElevenLabs
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  source TEXT NOT NULL CHECK (source IN ('twilio', 'elevenlabs')),
  
  phone_from TEXT,
  phone_to TEXT,
  duration INTEGER, -- en segundos
  cost DECIMAL(10, 4),
  status TEXT,
  call_date TIMESTAMPTZ,
  
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_call_snapshots_workspace ON call_snapshots(workspace_id);
CREATE INDEX IF NOT EXISTS idx_call_snapshots_date ON call_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_calls_workspace ON calls(workspace_id);
CREATE INDEX IF NOT EXISTS idx_calls_date ON calls(call_date DESC);
CREATE INDEX IF NOT EXISTS idx_calls_source ON calls(source);

-- Insertar workspace de ejemplo
INSERT INTO workspaces (id, name, phone_number) 
VALUES (2, 'Workspace Demo', '+34930340228')
ON CONFLICT (phone_number) DO NOTHING;

-- Row Level Security (RLS) - opcional si quieres auth
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Política permisiva para desarrollo (ajustar en producción)
CREATE POLICY "Allow all for authenticated users" ON workspaces FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON call_snapshots FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON calls FOR ALL USING (true);
