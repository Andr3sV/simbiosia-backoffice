# Migración a Sistema de Sincronización Horaria

## 📋 Resumen de Cambios

Se ha reestructurado completamente el sistema de sincronización para hacerlo más eficiente y escalable:

### Cambios Principales:

1. **Sincronización cada hora** (antes cada 12 horas)
2. **Tablas separadas** para snapshots de Twilio y ElevenLabs
3. **Eliminación de duplicados** automática con UPSERT
4. **Margen de seguridad** de 15 minutos para no perder datos
5. **Métricas detalladas** de ElevenLabs

---

## 🗄️ Nueva Estructura de Base de Datos

### Tablas Eliminadas:

- ❌ `call_snapshots` (tabla combinada antigua)

### Tablas Nuevas:

#### 1. `twilio_snapshots`

```sql
- workspace_id
- snapshot_date (redondea a la hora exacta)
- total_calls
- total_cost
- total_duration (en segundos)
- created_at
```

#### 2. `elevenlabs_snapshots`

```sql
- workspace_id
- snapshot_date (redondea a la hora exacta)
- total_conversations
- total_cost
- total_duration (en segundos)
- llm_usage (JSONB)
- llm_price
- llm_charge
- call_charge
- free_minutes_consumed
- free_llm_dollars_consumed
- dev_discount
- created_at
```

---

## ⚠️ IMPORTANTE: Sincronización Histórica en Progreso

Si actualmente tienes una sincronización histórica de ElevenLabs ejecutándose (por ejemplo, `/api/sync-elevenlabs` procesando 33,800+ conversaciones), **DEBES** seguir estos pasos adicionales:

### 🔒 Activar el Flag de Seguridad

Antes de desplegar, configura en Vercel:

```env
DISABLE_ELEVENLABS_HOURLY_SYNC=true
```

Esto desactivará temporalmente el cron job horario de ElevenLabs para evitar:

- ❌ Rate limiting de la API
- ❌ Conflictos de escritura en la base de datos
- ❌ Sobrecarga de recursos

**Una vez completada la sincronización histórica**, elimina esta variable y actualiza `vercel.json` para activar el cron.

Ver detalles en: [`ENV_VARIABLES.md`](./ENV_VARIABLES.md)

---

## 🚀 Pasos de Migración

### 1. Ejecutar el Script SQL en Supabase

Ve a tu dashboard de Supabase → SQL Editor y ejecuta:

```sql
-- Eliminar la tabla antigua de snapshots combinados
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

### 2. Desplegar en Vercel

```bash
git add .
git commit -m "Migración a sincronización horaria con tablas separadas"
git push
```

Vercel desplegará automáticamente y configurará los cron jobs:

- `/api/sync-hourly` → Cada hora en punto (0 \* \* \* \*) ✅ **Activo**
- `/api/sync-elevenlabs-hourly` → 5 minutos después de cada hora (5 \* \* \* \*) ⏸️ **Desactivado temporalmente**

> ⚠️ **Nota**: El cron de ElevenLabs está desactivado en `vercel.json` hasta que termine la sincronización histórica.
> Una vez complete, reemplaza `vercel.json` con el contenido de `vercel.json.COMPLETE`

### 3. Ejecutar la Primera Sincronización

Puedes ejecutar manualmente desde tu browser o terminal:

```bash
# Sincronizar Twilio (última 1h 15min)
curl -X POST http://localhost:3093/api/sync-hourly \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Sincronizar ElevenLabs (última 1h 15min)
curl -X POST http://localhost:3093/api/sync-elevenlabs-hourly \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

O usa el botón "Sync Now" en la interfaz web.

---

## 📊 Nuevos Endpoints

### API de Sincronización

#### `POST /api/sync-hourly`

- **Función**: Sincroniza llamadas de Twilio de la última hora + 15 min
- **Acción**: Guarda snapshots en `twilio_snapshots` y llamadas en `calls`
- **Evita duplicados**: Sí, con UPSERT

#### `POST /api/sync-elevenlabs-hourly`

- **Función**: Sincroniza conversaciones de ElevenLabs de la última hora + 15 min
- **Acción**: Guarda snapshots en `elevenlabs_snapshots` y conversaciones en `elevenlabs_conversations`
- **Evita duplicados**: Sí, con UPSERT

### API de Estadísticas

#### `GET /api/twilio-stats`

- Lee el último snapshot de cada workspace desde `twilio_snapshots`
- Retorna totales agregados

#### `GET /api/elevenlabs-stats`

- Lee el último snapshot de cada workspace desde `elevenlabs_snapshots`
- Retorna totales agregados con métricas detalladas

#### `GET /api/workspaces`

- Lee el último snapshot de `twilio_snapshots` y `elevenlabs_snapshots` por workspace
- Combina los datos para mostrar en el dashboard

---

## ⚙️ Configuración del Cron

El `vercel.json` ahora ejecuta:

```json
{
  "crons": [
    {
      "path": "/api/sync-hourly",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/sync-elevenlabs-hourly",
      "schedule": "5 * * * *"
    }
  ]
}
```

**Explicación**:

- Twilio se sincroniza en punto (ej: 10:00, 11:00, 12:00)
- ElevenLabs se sincroniza 5 minutos después (ej: 10:05, 11:05, 12:05)
- Esto evita sobrecarga de ejecutar ambos al mismo tiempo

---

## 🔧 Variables de Entorno

Asegúrate de tener configuradas:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# ElevenLabs
ELEVENLABS_API_KEY=your_elevenlabs_key

# Cron Secret (para seguridad)
CRON_SECRET=your_secret_here
NEXT_PUBLIC_CRON_SECRET=your_secret_here
```

---

## ✅ Verificación

### 1. Verificar que las tablas existen

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('twilio_snapshots', 'elevenlabs_snapshots');
```

### 2. Verificar que no existen duplicados

```sql
-- Twilio
SELECT workspace_id, snapshot_date, COUNT(*)
FROM twilio_snapshots
GROUP BY workspace_id, snapshot_date
HAVING COUNT(*) > 1;

-- ElevenLabs
SELECT workspace_id, snapshot_date, COUNT(*)
FROM elevenlabs_snapshots
GROUP BY workspace_id, snapshot_date
HAVING COUNT(*) > 1;
```

Ambas queries deben retornar 0 filas.

### 3. Verificar datos en el dashboard

- Ve a `http://localhost:3093`
- Verifica que ves workspaces con datos
- Ve a `/twilio` y verifica las métricas
- Ve a `/elevenlabs` y verifica las métricas detalladas

---

## 🐛 Troubleshooting

### "No data available" en el dashboard

1. Ejecuta manualmente la sincronización
2. Verifica que las tablas tengan datos: `SELECT COUNT(*) FROM twilio_snapshots;`
3. Verifica que los workspaces tienen teléfonos asociados en `workspace_phones`

### "Unauthorized" al ejecutar sync

1. Verifica que `CRON_SECRET` está configurado
2. Asegúrate de pasar el header correcto: `Authorization: Bearer YOUR_SECRET`

### Duplicados en la base de datos

- No deberían existir gracias a UPSERT y `UNIQUE(workspace_id, snapshot_date)`
- Si aparecen, revisa que el constraint UNIQUE esté presente

---

## 📈 Beneficios de la Nueva Arquitectura

1. ✅ **Más frecuente**: Datos actualizados cada hora
2. ✅ **Más eficiente**: Solo obtiene datos de la última hora
3. ✅ **Sin duplicados**: UPSERT garantiza datos únicos
4. ✅ **Métricas separadas**: Twilio y ElevenLabs en tablas independientes
5. ✅ **Métricas detalladas**: ElevenLabs ahora tiene todos sus campos específicos
6. ✅ **Escalable**: No hay problema con JSONs gigantes en una sola tabla

---

## 📝 Notas Importantes

- **Margen de 15 minutos**: Se agregan 15 minutos adicionales para evitar perder llamadas/conversaciones que lleguen con delay
- **Redondeo a la hora**: Los snapshots se guardan redondeando la fecha a la hora exacta (ej: 10:00, 11:00)
- **Workspace phones**: Asegúrate de que todos los números estén registrados en `workspace_phones`

---

¿Tienes preguntas? Revisa los logs de Vercel o el output de la terminal local para más detalles.
