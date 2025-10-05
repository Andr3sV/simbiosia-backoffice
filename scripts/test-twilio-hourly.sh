#!/bin/bash

echo "🧪 Probando sincronización horaria de Twilio con snapshots..."
echo ""

# Usar el puerto configurado (3093)
PORT=${PORT:-3093}

# Ejecutar el endpoint usando GET para testing
curl -X GET http://localhost:${PORT}/api/sync-twilio-hourly

echo ""
echo "✅ Test completado"

