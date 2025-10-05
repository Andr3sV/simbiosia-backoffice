# API Documentation 📡

Documentación de los endpoints de la API del backoffice.

## Base URL

- **Local**: `http://localhost:3000/api`
- **Production**: `https://tu-dominio.vercel.app/api`

---

## 🔄 POST/GET /api/sync

Sincroniza datos de Twilio y ElevenLabs con la base de datos.

### Request

**Headers:**

```
Authorization: Bearer {CRON_SECRET}
```

**Method:** `POST` o `GET`

### Response

**Success (200):**

```json
{
  "success": true,
  "synced_at": "2025-10-05T12:00:00.000Z",
  "results": [
    {
      "workspace_id": 2,
      "phone_number": "+34930340228",
      "twilio_calls": 15,
      "twilio_cost": 2.5,
      "elevenlabs_calls": 8,
      "elevenlabs_cost": 1.2,
      "total_calls": 23,
      "total_cost": 3.7,
      "snapshot_id": 42
    }
  ]
}
```

**Error (401):**

```json
{
  "error": "Unauthorized"
}
```

**Error (500):**

```json
{
  "success": false,
  "error": "Error message"
}
```

### Ejemplo cURL

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Authorization: Bearer your-cron-secret"
```

### Notas

- Este endpoint es llamado automáticamente por Vercel Cron cada 12 horas
- También puede ser llamado manualmente para sincronización inmediata
- Requiere autenticación con `CRON_SECRET` para prevenir acceso no autorizado

---

## 📊 GET /api/workspaces

Obtiene todos los workspaces con su snapshot más reciente.

### Request

**Method:** `GET`

**No requiere autenticación**

### Response

**Success (200):**

```json
{
  "success": true,
  "workspaces": [
    {
      "id": 2,
      "name": "Workspace Demo",
      "phone_number": "+34930340228",
      "created_at": "2025-10-05T10:00:00.000Z",
      "updated_at": "2025-10-05T10:00:00.000Z",
      "latest_snapshot": {
        "id": 42,
        "workspace_id": 2,
        "snapshot_date": "2025-10-05T12:00:00.000Z",
        "twilio_total_calls": 15,
        "twilio_total_cost": 2.5,
        "twilio_raw_data": [...],
        "elevenlabs_total_calls": 8,
        "elevenlabs_total_cost": 1.2,
        "elevenlabs_raw_data": [...],
        "combined_total_calls": 23,
        "combined_total_cost": 3.7,
        "created_at": "2025-10-05T12:00:00.000Z"
      }
    }
  ]
}
```

**Error (500):**

```json
{
  "success": false,
  "error": "Error message"
}
```

### Ejemplo cURL

```bash
curl http://localhost:3000/api/workspaces
```

### Ejemplo JavaScript

```javascript
const response = await fetch('/api/workspaces');
const data = await response.json();

if (data.success) {
  console.log('Workspaces:', data.workspaces);
}
```

---

## 📈 GET /api/workspaces/[id]/history

Obtiene el histórico de snapshots para un workspace específico.

### Request

**Method:** `GET`

**URL Parameters:**

- `id` (required): ID del workspace

**No requiere autenticación**

### Response

**Success (200):**

```json
{
  "success": true,
  "workspace_id": 2,
  "snapshots": [
    {
      "id": 45,
      "workspace_id": 2,
      "snapshot_date": "2025-10-05T12:00:00.000Z",
      "twilio_total_calls": 15,
      "twilio_total_cost": 2.5,
      "elevenlabs_total_calls": 8,
      "elevenlabs_total_cost": 1.2,
      "combined_total_calls": 23,
      "combined_total_cost": 3.7,
      "created_at": "2025-10-05T12:00:00.000Z"
    },
    {
      "id": 44,
      "workspace_id": 2,
      "snapshot_date": "2025-10-05T00:00:00.000Z",
      "twilio_total_calls": 12,
      "twilio_total_cost": 2.0,
      "elevenlabs_total_calls": 6,
      "elevenlabs_total_cost": 0.9,
      "combined_total_calls": 18,
      "combined_total_cost": 2.9,
      "created_at": "2025-10-05T00:00:00.000Z"
    }
  ]
}
```

**Error (400):**

```json
{
  "success": false,
  "error": "Invalid workspace ID"
}
```

**Error (500):**

```json
{
  "success": false,
  "error": "Error message"
}
```

### Ejemplo cURL

```bash
curl http://localhost:3000/api/workspaces/2/history
```

### Ejemplo JavaScript

```javascript
const workspaceId = 2;
const response = await fetch(`/api/workspaces/${workspaceId}/history`);
const data = await response.json();

if (data.success) {
  console.log('Snapshots:', data.snapshots);
}
```

### Notas

- Los snapshots están ordenados por fecha descendente (más reciente primero)
- Por defecto, retorna hasta 100 snapshots más recientes
- Útil para generar gráficos de tendencias

---

## 🔐 Seguridad

### Endpoint Protegido: `/api/sync`

- Requiere header `Authorization: Bearer {CRON_SECRET}`
- El `CRON_SECRET` debe ser una cadena aleatoria segura
- No exponer el `CRON_SECRET` en el código cliente

### Endpoints Públicos

Los siguientes endpoints NO requieren autenticación (por ahora):

- `/api/workspaces`
- `/api/workspaces/[id]/history`

**⚠️ Importante:** Si despliegas en producción, considera agregar autenticación con Supabase Auth.

---

## 📊 Estructura de Datos

### Workspace

```typescript
interface Workspace {
  id: number;
  name: string;
  phone_number: string;
  created_at: string;
  updated_at: string;
}
```

### Snapshot

```typescript
interface Snapshot {
  id: number;
  workspace_id: number;
  snapshot_date: string;
  twilio_total_calls: number;
  twilio_total_cost: number;
  twilio_raw_data: any;
  elevenlabs_total_calls: number;
  elevenlabs_total_cost: number;
  elevenlabs_raw_data: any;
  combined_total_calls: number;
  combined_total_cost: number;
  created_at: string;
}
```

### Call

```typescript
interface Call {
  id: string; // SID de Twilio o ID de ElevenLabs
  workspace_id: number;
  source: 'twilio' | 'elevenlabs';
  phone_from: string | null;
  phone_to: string | null;
  duration: number | null; // en segundos
  cost: number | null;
  status: string | null;
  call_date: string | null;
  raw_data: any;
  created_at: string;
}
```

---

## 🧪 Testing

### Test Sync (Local)

```bash
# Usando el script incluido
./scripts/test-sync.sh

# O manualmente
curl -X POST http://localhost:3000/api/sync \
  -H "Authorization: Bearer your-cron-secret"
```

### Test Sync (Production)

```bash
curl -X POST https://tu-dominio.vercel.app/api/sync \
  -H "Authorization: Bearer your-cron-secret"
```

### Test Get Workspaces

```bash
curl http://localhost:3000/api/workspaces | jq .
```

### Test Get History

```bash
curl http://localhost:3000/api/workspaces/2/history | jq .
```

---

## 🚀 Rate Limits

### Consideraciones

- **Twilio API**: ~4 requests/second por defecto
- **ElevenLabs API**: Depende de tu plan
- **Supabase**:
  - Plan gratuito: 500 MB de base de datos, 2 GB de transferencia
  - Sin límite de queries por segundo en planes pagos

### Recomendaciones

1. No ejecutar sincronizaciones manuales con mucha frecuencia
2. Considerar cachear respuestas en Redis si tienes mucho tráfico
3. Implementar retry logic con exponential backoff

---

## 📝 Changelog

### v1.0.0 (2025-10-05)

- ✅ Endpoint de sincronización inicial
- ✅ Obtención de workspaces
- ✅ Histórico de snapshots por workspace
- ✅ Integración con Twilio
- ✅ Integración con ElevenLabs

---

## 🔮 Endpoints Futuros (Roadmap)

- `POST /api/workspaces` - Crear workspace
- `PATCH /api/workspaces/[id]` - Actualizar workspace
- `DELETE /api/workspaces/[id]` - Eliminar workspace
- `GET /api/calls` - Obtener llamadas individuales con filtros
- `GET /api/analytics/costs` - Analytics avanzados de costos
- `POST /api/alerts` - Configurar alertas de costos

---

## 💡 Tips

1. **Paginación**: Si tienes muchos snapshots, considera agregar parámetros `page` y `limit`
2. **Filtros por fecha**: Agrega parámetros `from` y `to` para filtrar por rango de fechas
3. **Caché**: Considera cachear las respuestas de workspaces por 5-10 minutos
4. **Webhooks**: Considera agregar webhooks de Twilio para datos en tiempo real
