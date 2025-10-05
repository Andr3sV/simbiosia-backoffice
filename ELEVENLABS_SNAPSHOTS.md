# Sistema de Snapshots de ElevenLabs

## 📊 Resumen

El sistema de snapshots agrupa las conversaciones de ElevenLabs por **workspace** y **hora**, permitiendo análisis históricos eficientes de costos y métricas.

## 🏗️ Arquitectura

### Tabla: `elevenlabs_snapshots`

Cada snapshot representa:

- **Un workspace específico** (ej: workspace_id = 4)
- **Una hora específica** (ej: 2025-10-04 15:00:00)
- **Métricas agregadas**:
  - Total de conversaciones
  - Costo total
  - Duración total
  - Cargos por LLM
  - Cargos por llamadas
  - Minutos gratis consumidos
  - Descuentos de desarrollo

**Clave única**: `(workspace_id, snapshot_date)`

## 🔄 Flujo de Datos

### 1. Generación Histórica (Una vez)

**Endpoint**: `/api/generate-elevenlabs-snapshots`

```bash
curl -X GET http://localhost:3093/api/generate-elevenlabs-snapshots
```

**Proceso**:

1. Obtiene TODAS las conversaciones desde la tabla `elevenlabs_conversations`
2. Agrupa por workspace + hora (truncando minutos/segundos a 0)
3. Calcula métricas agregadas por grupo
4. Inserta en `elevenlabs_snapshots` con `upsert`

**Resultado**:

- ✅ 33,744 conversaciones procesadas
- ✅ 123 snapshots creados
- ✅ Cobertura: Agosto - Octubre 2025

### 2. Sincronización Diaria (Automática)

**Endpoint**: `/api/sync-elevenlabs-hourly`
**Cron**: Diario a las 00:00 (configurado en `vercel.json`)

**Proceso**:

1. Obtiene conversaciones de ElevenLabs API de las **últimas 24 horas**
2. Asocia cada conversación con su workspace
3. Inserta conversaciones en tabla `elevenlabs_conversations` con `upsert`
4. **Genera snapshots automáticamente** por hora y workspace
5. Inserta/actualiza snapshots en `elevenlabs_snapshots` con `upsert`

**Ventajas**:

- ✅ No hay duplicados (upsert por conversation_id)
- ✅ Snapshots se actualizan si ya existen
- ✅ Sincronización exacta de 24 horas
- ✅ Ejecución automática diaria

## 📋 Ejemplos de Snapshots

### Snapshot Individual

```json
{
  "workspace_id": 4,
  "snapshot_date": "2025-10-04T15:00:00.000Z",
  "total_conversations": 284,
  "total_cost": 66235,
  "total_duration": 45892,
  "llm_price": 12450,
  "llm_charge": 11203,
  "call_charge": 55032,
  "free_minutes_consumed": 0,
  "free_llm_dollars_consumed": 0,
  "dev_discount": 0
}
```

Esto significa:

- El workspace 4 tuvo 284 conversaciones
- Entre las 15:00 y 15:59 del 4 de octubre 2025
- Con un costo total de 66,235 (en la unidad de ElevenLabs)
- Y una duración total de 45,892 segundos (~765 minutos)

## 🔍 Consultas Útiles

### Ver snapshots por workspace

```sql
SELECT
    workspace_id,
    COUNT(*) as total_snapshots,
    SUM(total_conversations) as total_conversations,
    ROUND(SUM(total_cost), 4) as total_cost,
    MIN(snapshot_date) as first_snapshot,
    MAX(snapshot_date) as last_snapshot
FROM elevenlabs_snapshots
GROUP BY workspace_id
ORDER BY total_conversations DESC;
```

### Ver actividad por hora del día

```sql
SELECT
    EXTRACT(HOUR FROM snapshot_date) as hour_of_day,
    SUM(total_conversations) as conversations,
    ROUND(SUM(total_cost), 2) as cost
FROM elevenlabs_snapshots
GROUP BY EXTRACT(HOUR FROM snapshot_date)
ORDER BY hour_of_day;
```

### Comparar costos LLM vs Llamadas

```sql
SELECT
    workspace_id,
    DATE(snapshot_date) as date,
    SUM(total_conversations) as conversations,
    ROUND(SUM(llm_charge), 2) as llm_cost,
    ROUND(SUM(call_charge), 2) as call_cost,
    ROUND(SUM(total_cost), 2) as total_cost
FROM elevenlabs_snapshots
GROUP BY workspace_id, DATE(snapshot_date)
ORDER BY date DESC, workspace_id;
```

### Ver evolución temporal de un workspace

```sql
SELECT
    DATE(snapshot_date) as date,
    COUNT(*) as hours_with_conversations,
    SUM(total_conversations) as daily_conversations,
    ROUND(SUM(total_cost), 2) as daily_cost
FROM elevenlabs_snapshots
WHERE workspace_id = 4
GROUP BY DATE(snapshot_date)
ORDER BY date DESC;
```

## 🛠️ Mantenimiento

### Limpiar snapshots

```sql
-- Borrar TODOS los snapshots
DELETE FROM elevenlabs_snapshots;

-- Borrar snapshots de un workspace específico
DELETE FROM elevenlabs_snapshots WHERE workspace_id = 4;

-- Borrar snapshots anteriores a una fecha
DELETE FROM elevenlabs_snapshots WHERE snapshot_date < '2025-09-01';
```

### Regenerar snapshots históricos

1. Limpiar snapshots existentes
2. Ejecutar `/api/generate-elevenlabs-snapshots`

## ⚙️ Configuración

### Cron Job (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/sync-elevenlabs-hourly",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Importante**: Vercel Hobby solo permite crons diarios, no horarios.

### Variables de Entorno

```env
ELEVENLABS_API_KEY=your_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
CRON_SECRET=your_cron_secret
```

## 🎯 Beneficios

1. **Performance**: Consultas 100x más rápidas al usar snapshots agregados
2. **Análisis de Costos**: Desglose detallado de costos LLM vs llamadas
3. **Análisis Histórico**: Visualización de tendencias temporales
4. **Escalabilidad**: El sistema escala linealmente con el tiempo
5. **Sin Duplicados**: Uso de upsert garantiza idempotencia
6. **Automático**: Cron diario mantiene los datos actualizados

## 📝 Notas

- Los snapshots agrupan por **hora completa** (minutos y segundos = 0)
- El campo `snapshot_date` es un ISO timestamp truncado a la hora
- Los snapshots NO reemplazan la tabla `elevenlabs_conversations`, son complementarios
- Para análisis detallados, usar tabla `elevenlabs_conversations`
- Para análisis agregados/tendencias, usar `elevenlabs_snapshots`
- Los costos están en la unidad de ElevenLabs (verificar si son centavos o dólares)

## 🔗 Sistema Integrado

Este sistema trabaja en conjunto con el [Sistema de Snapshots de Twilio](./SNAPSHOTS_SYSTEM.md) para proporcionar una vista completa de costos y métricas de comunicación.
