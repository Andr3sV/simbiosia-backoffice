#!/bin/bash

echo "🚀 Generando snapshots históricos de Twilio..."
echo ""

# Usar el puerto configurado (3093)
PORT=${PORT:-3093}

# Ejecutar el endpoint usando GET para simplicidad
curl -X GET http://localhost:${PORT}/api/generate-twilio-snapshots

echo ""
echo "✅ Proceso completado"

