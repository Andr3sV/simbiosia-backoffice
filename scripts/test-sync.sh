#!/bin/bash

# Script para probar la sincronización manualmente
# Uso: ./scripts/test-sync.sh

echo "🔄 Testing sync endpoint..."
echo ""

# Leer el CRON_SECRET del archivo .env.local si existe
if [ -f .env.local ]; then
    export $(cat .env.local | grep CRON_SECRET | xargs)
fi

if [ -z "$CRON_SECRET" ]; then
    echo "⚠️  CRON_SECRET not found in .env.local"
    echo "Please set it or pass it as an argument:"
    echo "./scripts/test-sync.sh YOUR_SECRET"
    exit 1
fi

# Permitir pasar el secreto como argumento
if [ ! -z "$1" ]; then
    CRON_SECRET=$1
fi

echo "Using CRON_SECRET: ${CRON_SECRET:0:10}..."
echo ""

# Hacer la petición
echo "Making request to http://localhost:3000/api/sync"
echo ""

curl -X POST http://localhost:3000/api/sync \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  --silent | jq .

echo ""
echo "✅ Sync test completed!"
