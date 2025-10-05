# Sistema de Snapshots de Twilio

## 📊 Resumen

El sistema de snapshots agrupa las llamadas de Twilio por **workspace** y **hora**, permitiendo análisis históricos eficientes y evitando la necesidad de procesar 58k+ llamadas cada vez.

## 🏗️ Arquitectura

### Tabla: `twilio_snapshots`

Cada snapshot representa:

- **Un workspace específico** (ej: workspace_id = 4)
- **Una hora específica** (ej: 2025-10-04 15:00:00)
- **Métricas agregadas**: total de llamadas, costo total, duración total

**Clave única**: `(workspace_id, snapshot_date)`

## 🔄 Flujo de Datos

### 1. Generación Histórica (Una vez)

**Endpoint**: `/api/generate-twilio-snapshots`

```bash
curl -X GET http://localhost:3093/api/generate-twilio-snapshots
```

**Proceso**:

1. Obtiene TODAS las llamadas de Twilio desde la tabla `calls`
2. Agrupa por workspace + hora (truncando minutos/segundos a 0)
3. Calcula métricas agregadas por grupo
4. Inserta en `twilio_snapshots` con `upsert`

**Resultado**:

- ✅ 57,952 llamadas procesadas
- ✅ 412 snapshots creados
- ✅ Cobertura: Agosto - Octubre 2025

### 2. Sincronización Diaria (Automática)

**Endpoint**: `/api/sync-twilio-hourly`
**Cron**: Diario a las 00:00 (configurado en `vercel.json`)

**Proceso**:

1. Obtiene llamadas de Twilio de las **últimas 24 horas**
2. Clasifica y asigna workspace (casos 1, 2, 3)
3. Inserta llamadas en tabla `calls` con `upsert`
4. **Genera snapshots automáticamente** por hora y workspace
5. Inserta/actualiza snapshots en `twilio_snapshots` con `upsert`

**Ventajas**:

- ✅ No hay duplicados (upsert por ID en calls)
- ✅ Snapshots se actualizan si ya existen (upsert por workspace_id + snapshot_date)
- ✅ Sincronización exacta de 24 horas sin traslape
- ✅ Ejecución automática diaria

## 📋 Ejemplos de Snapshots

### Snapshot Individual

```json
{
  "workspace_id": 4,
  "snapshot_date": "2025-10-04T15:00:00.000Z",
  "total_calls": 182,
  "total_cost": 3.8596,
  "total_duration": 4872
}
```

Esto significa:

- El workspace 4 realizó 182 llamadas
- Entre las 15:00 y 15:59 del 4 de octubre 2025
- Con un costo total de $3.86
- Y una duración total de 4,872 segundos (81 minutos)

## 🔍 Consultas Útiles

### Ver snapshots por workspace

```sql
SELECT
    workspace_id,
    COUNT(*) as total_snapshots,
    SUM(total_calls) as total_calls,
    ROUND(SUM(total_cost), 4) as total_cost,
    MIN(snapshot_date) as first_snapshot,
    MAX(snapshot_date) as last_snapshot
FROM twilio_snapshots
GROUP BY workspace_id
ORDER BY total_calls DESC;
```

### Ver actividad por hora del día

```sql
SELECT
    EXTRACT(HOUR FROM snapshot_date) as hour_of_day,
    SUM(total_calls) as calls,
    ROUND(SUM(total_cost), 2) as cost
FROM twilio_snapshots
GROUP BY EXTRACT(HOUR FROM snapshot_date)
ORDER BY hour_of_day;
```

### Ver evolución temporal de un workspace

```sql
SELECT
    DATE(snapshot_date) as date,
    COUNT(*) as hours_with_calls,
    SUM(total_calls) as daily_calls,
    ROUND(SUM(total_cost), 2) as daily_cost
FROM twilio_snapshots
WHERE workspace_id = 4
GROUP BY DATE(snapshot_date)
ORDER BY date DESC;
```

## 🛠️ Mantenimiento

### Limpiar snapshots

```sql
-- Borrar TODOS los snapshots
DELETE FROM twilio_snapshots;

-- Borrar snapshots de un workspace específico
DELETE FROM twilio_snapshots WHERE workspace_id = 1;

-- Borrar snapshots anteriores a una fecha
DELETE FROM twilio_snapshots WHERE snapshot_date < '2025-09-01';
```

### Regenerar snapshots históricos

1. Limpiar snapshots existentes
2. Ejecutar `/api/generate-twilio-snapshots`

## ⚙️ Configuración

### Cron Job (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/sync-twilio-hourly",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Importante**: Vercel Hobby solo permite crons diarios, no horarios.

### Variables de Entorno

```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
CRON_SECRET=your_cron_secret
```

## 🎯 Beneficios

1. **Performance**: Consultas 100x más rápidas al usar snapshots agregados
2. **Análisis Histórico**: Fácil visualización de tendencias temporales
3. **Escalabilidad**: El sistema escala linealmente con el tiempo
4. **Sin Duplicados**: Uso de upsert garantiza idempotencia
5. **Automático**: Cron diario mantiene los datos actualizados

## 📝 Notas

- Los snapshots agrupan por **hora completa** (minutos y segundos = 0)
- El campo `snapshot_date` es un ISO timestamp truncado a la hora
- Los snapshots NO reemplazan la tabla `calls`, son complementarios
- Para análisis detallados, usar tabla `calls`
- Para análisis agregados/tendencias, usar `twilio_snapshots`
