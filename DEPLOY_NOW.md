# 🚀 Deploy - Migración a Sincronización Horaria

## 📊 Situación Actual

Tienes un proceso histórico de ElevenLabs corriendo (recuperando ~33,800 conversaciones).

## ✅ Solución Simple

Como NO harás llamadas nuevas hoy, simplemente:

1. **Despliega el código** con solo el cron de Twilio activo
2. **Cuando termine el histórico**, activas el cron de ElevenLabs

---

## 🔧 Pasos a Seguir

### 1. Ejecutar SQL en Supabase (2 minutos)

Ve a Supabase → SQL Editor y ejecuta:

```sql
-- Eliminar la tabla antigua
DROP TABLE IF EXISTS public.call_snapshots CASCADE;

-- Tabla de snapshots para Twilio
CREATE TABLE IF NOT EXISTS public.twilio_snapshots (
  id BIGSERIAL PRIMARY KEY,
  workspace_id BIGINT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  snapshot_date TIMESTAMPTZ NOT NULL,
  total_calls INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 4) DEFAULT 0,
  total_duration INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, snapshot_date)
);

-- Tabla de snapshots para ElevenLabs
CREATE TABLE IF NOT EXISTS public.elevenlabs_snapshots (
  id BIGSERIAL PRIMARY KEY,
  workspace_id BIGINT REFERENCES public.workspaces(id) ON DELETE CASCADE,
  snapshot_date TIMESTAMPTZ NOT NULL,
  total_conversations INTEGER DEFAULT 0,
  total_cost DECIMAL(10, 4) DEFAULT 0,
  total_duration INTEGER DEFAULT 0,
  llm_usage JSONB,
  llm_price DECIMAL(10, 4) DEFAULT 0,
  llm_charge DECIMAL(10, 4) DEFAULT 0,
  call_charge DECIMAL(10, 4) DEFAULT 0,
  free_minutes_consumed DECIMAL(10, 4) DEFAULT 0,
  free_llm_dollars_consumed DECIMAL(10, 4) DEFAULT 0,
  dev_discount DECIMAL(10, 4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workspace_id, snapshot_date)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_twilio_snapshots_workspace ON public.twilio_snapshots(workspace_id);
CREATE INDEX IF NOT EXISTS idx_twilio_snapshots_date ON public.twilio_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_elevenlabs_snapshots_workspace ON public.elevenlabs_snapshots(workspace_id);
CREATE INDEX IF NOT EXISTS idx_elevenlabs_snapshots_date ON public.elevenlabs_snapshots(snapshot_date DESC);

-- RLS
ALTER TABLE public.twilio_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elevenlabs_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated users" ON public.twilio_snapshots FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON public.elevenlabs_snapshots FOR ALL USING (true);
```

### 2. Deploy (1 minuto)

```bash
git add .
git commit -m "Migración a sincronización horaria con tablas separadas"
git push
```

Vercel desplegará automáticamente con:

- ✅ Cron de **Twilio** activo (cada hora)
- ⏸️ Cron de **ElevenLabs** sin configurar (lo agregas después)

---

## ⏱️ Cuando Termine el Histórico (7-10 horas)

### Paso 1: Verificar que terminó

En los logs deberías ver:

```
✅ ElevenLabs sync completed: 33800 conversations saved
```

### Paso 2: Activar cron de ElevenLabs

Reemplaza `vercel.json`:

```bash
cp vercel.json.COMPLETE vercel.json
git add vercel.json
git commit -m "Activar cron horario de ElevenLabs"
git push
```

Esto agregará el cron que se ejecuta 5 minutos después de cada hora.

---

## 📋 Estado de Cron Jobs

### Ahora

- ✅ **Twilio**: Cada hora en punto (0 \* \* \* \*)
- ⏸️ **ElevenLabs**: No configurado

### Después

- ✅ **Twilio**: Cada hora en punto (0 \* \* \* \*)
- ✅ **ElevenLabs**: 5 minutos después de cada hora (5 \* \* \* \*)

---

## 🔍 Verificar Funcionamiento

### Twilio (después del deploy)

```bash
curl -X POST https://tu-app.vercel.app/api/sync-hourly \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Debería sincronizar llamadas de la última hora.

### Dashboard

- Home: http://tu-app.vercel.app/
- Twilio: http://tu-app.vercel.app/twilio
- ElevenLabs: http://tu-app.vercel.app/elevenlabs

---

## ✅ Checklist

- [ ] SQL ejecutado en Supabase
- [ ] Deploy hecho
- [ ] Dashboard cargando correctamente
- [ ] Esperar a que termine histórico de ElevenLabs
- [ ] Activar cron de ElevenLabs con `vercel.json.COMPLETE`

---

¡Listo! 🚀
