#!/bin/bash

echo "🚀 Generando snapshots históricos de ElevenLabs..."
echo ""

# Usar el puerto configurado (3093)
PORT=${PORT:-3093}

# Ejecutar el endpoint usando GET para simplicidad
curl -X GET http://localhost:${PORT}/api/generate-elevenlabs-snapshots

echo ""
echo "✅ Proceso completado"

