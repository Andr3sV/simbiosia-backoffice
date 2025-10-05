-- Migración para soportar múltiples números por workspace

-- 1. Crear tabla de números de teléfono
CREATE TABLE IF NOT EXISTS workspace_phones (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER REFERENCES workspaces(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, phone_number)
);

-- 2. Índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_workspace_phones_workspace ON workspace_phones(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_phones_number ON workspace_phones(phone_number);

-- 3. Migrar datos existentes de workspaces a workspace_phones
INSERT INTO workspace_phones (workspace_id, phone_number, is_primary)
SELECT id, phone_number, true
FROM workspaces
WHERE phone_number IS NOT NULL
ON CONFLICT (workspace_id, phone_number) DO NOTHING;

-- 4. RLS para workspace_phones
ALTER TABLE workspace_phones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON workspace_phones FOR ALL USING (true);

-- Nota: NO eliminamos la columna phone_number de workspaces por compatibilidad
-- pero ahora la fuente de verdad es workspace_phones
