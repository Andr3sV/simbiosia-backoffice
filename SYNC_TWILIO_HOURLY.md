# Sincronización Horaria de Twilio

## Descripción

Endpoint que sincroniza automáticamente las llamadas de Twilio cada hora, aplicando la misma lógica de los 3 casos de la resincronización histórica.

## Endpoint

**URL:** `/api/sync-twilio-hourly`  
**Método:** `POST` o `GET`  
**Autenticación:** Bearer token con `CRON_SECRET`

## Diferencias con la Resincronización Histórica

| Característica       | Histórico           | Horario              |
| -------------------- | ------------------- | -------------------- |
| **Periodo**          | Desde 1 agosto 2025 | Última 1h 15min      |
| **Frecuencia**       | Manual/una vez      | Automática cada hora |
| **Volumen**          | ~58k llamadas       | ~50-200 llamadas     |
| **Tiempo ejecución** | 5-10 minutos        | 5-15 segundos        |
| **Paginación**       | Múltiples páginas   | 1 página (1000 max)  |

## Lógica de Asignación de Workspaces

### ✅ Implementa los 3 casos correctamente:

**Caso 1: outbound-api**

- El número `from` es del workspace
- Busca en `workspace_phones` → asigna `workspace_id`
- Si no existe → crea en `workspace_phones` con `workspace_id = 1`

**Caso 2: trunking-terminating**

- Misma lógica que Caso 1
- El número `from` es del workspace

**Caso 3: trunking-originating** (transferencias desde ElevenLabs)

- El número `from` es del lead
- Busca ese número en el campo `to` de TODAS las llamadas caso 1 y 2
- Si hay múltiples coincidencias → selecciona la más cercana en tiempo
- Usa el `from` de esa llamada para obtener el `workspace_id`

## Configuración Vercel Cron

```json
{
  "crons": [
    {
      "path": "/api/sync-twilio-hourly",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Schedule:** `0 * * * *` = Cada hora en punto (00:00, 01:00, 02:00, etc.)

## Ejecución Manual

### Producción

```bash
curl -X POST https://tu-dominio.vercel.app/api/sync-twilio-hourly \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

### Desarrollo Local

```bash
curl -X POST http://localhost:3093/api/sync-twilio-hourly \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

## Respuesta Exitosa

```json
{
  "success": true,
  "synced_at": "2025-10-05T20:00:00.000Z",
  "period": {
    "start": "2025-10-05T18:45:00.000Z",
    "end": "2025-10-05T20:00:00.000Z"
  },
  "totalCalls": 87,
  "savedCalls": 87,
  "createdPhones": 0,
  "case1Count": 62,
  "case2Count": 15,
  "case3Count": 10,
  "message": "Sincronización horaria completada"
}
```

## Logs Típicos

```
🔄 Iniciando sincronización horaria de Twilio...
📅 Periodo: 2025-10-05T18:45:00.000Z - 2025-10-05T20:00:00.000Z
📱 Mapa de 17 números a workspaces cargado
📞 Obteniendo llamadas de la última hora...
  📞 87 llamadas obtenidas

📊 Procesando 87 llamadas...
  📤 Caso 1&2 (outbound-api/trunking-terminating): 77
  📥 Caso 3 (trunking-originating): 10

💾 Insertando 87 llamadas...
  ✅ Guardadas 87 llamadas

🎉 Sincronización horaria completada!
📊 Total llamadas obtenidas: 87
  📤 Caso 1 (outbound-api): 62
  📤 Caso 2 (trunking-terminating): 15
  📥 Caso 3 (trunking-originating): 10
💾 Total llamadas guardadas: 87
📱 Números de workspace creados: 0
```

## Manejo de Duplicados

- Usa `upsert` con `onConflict: 'id'`
- Si una llamada ya existe (mismo SID), se actualiza
- No hay duplicación de datos

## Margen de 15 Minutos

El endpoint sincroniza las últimas **1 hora y 15 minutos** en lugar de solo 1 hora para:

1. **Evitar perder datos** por delays en la API de Twilio
2. **Cubrir llamadas en progreso** al momento de la sincronización anterior
3. **Manejar diferencias de timezone** y clock skew

## Monitoreo

### Verificar última sincronización

```sql
SELECT
  MAX(call_date) as ultima_llamada_sincronizada,
  COUNT(*) as total_ultima_hora
FROM calls
WHERE source = 'twilio'
  AND call_date >= NOW() - INTERVAL '1 hour';
```

### Ver llamadas por hora

```sql
SELECT
  DATE_TRUNC('hour', call_date) as hora,
  COUNT(*) as llamadas,
  COUNT(DISTINCT workspace_id) as workspaces,
  SUM(cost) as costo_total
FROM calls
WHERE source = 'twilio'
  AND call_date >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', call_date)
ORDER BY hora DESC;
```

### Alertas recomendadas

1. **Sin llamadas en 2+ horas** → Verificar cron
2. **Muchas llamadas en workspace 1** → Revisar `workspace_phones`
3. **Errores 500 repetidos** → Revisar logs de Vercel

## Troubleshooting

### Problema: No se ejecuta el cron

**Solución:**

- Verificar que `vercel.json` está en el root
- Verificar que está desplegado en Vercel (no funciona en local)
- Revisar logs en Vercel Dashboard → Cron Jobs

### Problema: Muchas llamadas en workspace 1

**Solución:**

- Verificar que los números están en `workspace_phones`
- Ejecutar consulta de verificación:

```sql
SELECT phone_number, COUNT(*) as calls
FROM calls
WHERE workspace_id = 1 AND source = 'twilio'
GROUP BY phone_number
ORDER BY calls DESC;
```

### Problema: Caso 3 no encuentra workspace correcto

**Solución:**

- Verificar que hay llamadas outbound-api o trunking-terminating relacionadas
- La llamada relacionada debe tener el lead en el campo `to`
- Verificar diferencia de tiempo (debe ser cercana)

## Próximos Pasos

1. ✅ Deploy a Vercel
2. ✅ Verificar primera ejecución automática
3. ✅ Monitorear logs durante 24 horas
4. ✅ Ajustar alertas según volumen real

## Archivos Relacionados

- Endpoint histórico: `/app/api/resync-twilio-historical/route.ts`
- Endpoint horario: `/app/api/sync-twilio-hourly/route.ts`
- Configuración cron: `/vercel.json`
- Documentación histórico: `/RESYNC_TWILIO_HISTORICO.md`
