# Resincronización Histórica de Twilio

## Descripción

Este endpoint permite recuperar todas las conversaciones históricas de Twilio desde el **1 de agosto de 2025** y almacenarlas correctamente en la tabla `calls` de Supabase, manejando los 3 tipos de llamadas diferentes.

## Tipos de Llamadas

### Caso 1: Llamadas via API (`outbound-api`)

- **Dirección**: `outbound-api`
- **Número FROM**: Número del workspace
- **Lógica**: Busca el número `from` en `workspace_phones` para obtener el `workspace_id`
- **Si no existe**: Crea el número en `workspace_phones` con `workspace_id = 1`

**Ejemplo:**

```json
{
  "to": "+34637954900",
  "sid": "CA00e4ec42cc90abd99621a277fc609c4c",
  "from": "+34881198794",
  "direction": "outbound-api"
}
```

### Caso 2: Llamadas via SIP Trunk salientes (`trunking-terminating`)

- **Dirección**: `trunking-terminating`
- **Número FROM**: Número del workspace
- **Lógica**: Misma que Caso 1

**Ejemplo:**

```json
{
  "to": "+34687003696",
  "sid": "CA00decb687ff9b37b39e13b0dae63b18b",
  "from": "+34930349294",
  "direction": "trunking-terminating"
}
```

### Caso 3: Transferencias desde ElevenLabs (`trunking-originating`)

- **Dirección**: `trunking-originating`
- **Número FROM**: Número del lead (no del workspace)
- **Lógica Compleja**:
  1. Toma el número `from` de la llamada (número del lead)
  2. Busca en llamadas `trunking-terminating` donde el campo `to` coincida con ese número
  3. Si hay múltiples coincidencias, selecciona la llamada más cercana en tiempo al `endTime` de la llamada actual
  4. Usa el número `from` de esa llamada encontrada para buscar el `workspace_id` en `workspace_phones`
  5. Si el número no existe en `workspace_phones`, lo crea con `workspace_id = 1`

**Ejemplo:**

```json
{
  "to": "sip:+34911679868@public-vip.ie1.twilio.com",
  "sid": "CA00e421958912ff7d40ba1fa4f4f42313",
  "from": "+34679950910",
  "direction": "trunking-originating"
}
```

## Cómo Ejecutar

### Requisitos

- Variable de entorno `CRON_SECRET` configurada
- Variables de entorno de Twilio configuradas:
  - `TWILIO_ACCOUNT_SID`
  - `TWILIO_AUTH_TOKEN`
- Variables de entorno de Supabase configuradas

### Ejecución via curl

```bash
curl -X POST https://tu-dominio.vercel.app/api/resync-twilio-historical \
  -H "Authorization: Bearer TU_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Ejecución Local (desarrollo)

```bash
curl -X POST http://localhost:3000/api/resync-twilio-historical \
  -H "Authorization: Bearer TU_CRON_SECRET" \
  -H "Content-Type: application/json"
```

## Respuesta del Endpoint

### Respuesta Exitosa (200)

```json
{
  "success": true,
  "totalCalls": 1523,
  "savedCalls": 1523,
  "createdPhones": 5,
  "case1Count": 345,
  "case2Count": 1089,
  "case3Count": 89,
  "message": "Resincronización histórica completada"
}
```

**Campos:**

- `totalCalls`: Total de llamadas obtenidas de Twilio
- `savedCalls`: Total de llamadas guardadas en la BD
- `createdPhones`: Números de workspace creados automáticamente
- `case1Count`: Llamadas de tipo `outbound-api`
- `case2Count`: Llamadas de tipo `trunking-terminating`
- `case3Count`: Llamadas de tipo `trunking-originating`

### Respuesta de Error (401)

```json
{
  "error": "Unauthorized"
}
```

### Respuesta de Error (500)

```json
{
  "success": false,
  "error": "Mensaje de error específico"
}
```

## Funcionamiento Interno

1. **Carga inicial**: Carga todos los números de `workspace_phones` en memoria para búsqueda rápida
2. **Paginación**: Obtiene todas las llamadas de Twilio en páginas de 100, con manejo de rate limiting
3. **Clasificación**: Separa las llamadas en dos grupos:
   - Casos 1 y 2: `outbound-api` y `trunking-terminating`
   - Caso 3: `trunking-originating`
4. **Procesamiento Casos 1 y 2**:
   - Busca el workspace_id por el número `from`
   - Crea números faltantes con workspace_id = 1
5. **Procesamiento Caso 3**:
   - Para cada llamada, busca la correspondiente `trunking-terminating` más cercana en tiempo
   - Infiere el workspace_id desde esa llamada relacionada
6. **Inserción por lotes**: Guarda todas las llamadas en lotes de 500 con `upsert` (no duplica si ya existen)

## Logs y Monitoreo

El endpoint proporciona logs detallados en cada fase:

```
🔄 Iniciando resincronización histórica de Twilio desde Agosto 1, 2025...
📅 Periodo: 2025-08-01T00:00:00.000Z - 2025-10-05T...
📱 Mapa de 12 números a workspaces cargado

📄 Obteniendo página 1...
  📞 Obtenidas 100 llamadas (total: 100)...

📊 Total de 1523 llamadas obtenidas. Procesando...
  📤 Caso 1&2 (outbound-api/trunking-terminating): 1434
  📥 Caso 3 (trunking-originating): 89

  ➕ Creando número de workspace: +34881198794

💾 Insertando 1523 llamadas en base de datos...
  ✅ Lote 1: 500 llamadas
  ✅ Lote 2: 500 llamadas
  ✅ Lote 3: 500 llamadas
  ✅ Lote 4: 23 llamadas

🎉 Resincronización completada!
📊 Total llamadas obtenidas: 1523
  📤 Caso 1 (outbound-api): 345
  📤 Caso 2 (trunking-terminating): 1089
  📥 Caso 3 (trunking-originating): 89
💾 Total llamadas guardadas: 1523
📱 Números de workspace creados: 5
```

## Consideraciones Importantes

1. **Idempotente**: El endpoint usa `upsert`, por lo que puede ejecutarse múltiples veces sin duplicar datos
2. **Rate Limiting**: Maneja automáticamente los límites de rate de Twilio esperando 60 segundos cuando es necesario
3. **Memoria**: Carga todas las llamadas en memoria antes de procesar (considera esto para datasets muy grandes)
4. **Workspace por defecto**: Todos los números nuevos se crean con `workspace_id = 1`
5. **Tiempo de ejecución**: Puede tardar varios minutos dependiendo del volumen de llamadas

## Problemas Conocidos y Soluciones

### Problema: Timeout en Vercel

**Solución**: Los timeouts de Vercel son de 10 segundos (plan gratuito) o 60 segundos (plan Pro). Para grandes volúmenes, considera:

- Ejecutar en local
- Dividir el rango de fechas
- Aumentar el plan de Vercel

### Problema: Llamadas sin endTime (Caso 3)

**Solución**: Se asigna automáticamente al workspace_id = 1

### Problema: No se encuentra llamada relacionada (Caso 3)

**Solución**: Se asigna automáticamente al workspace_id = 1 y se registra en los logs

## Próximos Pasos Recomendados

1. Verificar los números creados automáticamente en `workspace_phones`
2. Revisar si algún número necesita ser reasignado a un workspace diferente
3. Confirmar que el conteo de llamadas coincide con lo esperado en Twilio Console
4. Ejecutar consultas de validación en Supabase:

```sql
-- Verificar distribución por tipo de llamada
SELECT
  raw_data->>'direction' as direction,
  COUNT(*) as total,
  SUM(cost) as total_cost
FROM calls
WHERE source = 'twilio'
  AND call_date >= '2025-08-01'
GROUP BY raw_data->>'direction';

-- Verificar números nuevos creados
SELECT * FROM workspace_phones
WHERE workspace_id = 1
  AND created_at >= NOW() - INTERVAL '1 hour';
```
