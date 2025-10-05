# 🚀 Deploy Simplificado

## Lo que cambió

✅ **Tablas nuevas**: `twilio_snapshots` y `elevenlabs_snapshots` (separadas)  
❌ **Tabla antigua**: `call_snapshots` (se elimina)  
⏰ **Frecuencia**: Cada hora (antes cada 12 horas)

## Pasos

### 1. SQL en Supabase

Ejecuta el archivo: `supabase/new_snapshot_tables.sql`

### 2. Deploy

```bash
git add .
git commit -m "Migración a sincronización horaria"
git push
```

### 3. Crear Snapshot Histórico de Twilio

Una vez desplegado, ejecuta:
```bash
curl -X POST https://tu-app.vercel.app/api/create-historical-snapshot \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Esto crea un snapshot con TODOS los datos históricos de Twilio que ya están en `calls`.

### 4. Cuando termine el histórico de ElevenLabs

```bash
cp vercel.json.COMPLETE vercel.json
git add vercel.json
git commit -m "Activar cron de ElevenLabs"
git push
```

## Estado Actual

- ✅ Twilio: Sincroniza cada hora
- ⏸️ ElevenLabs: Se activa después del histórico

¡Listo! 🎉
