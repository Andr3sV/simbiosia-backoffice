#!/bin/bash

# Script para agregar un nuevo workspace a la base de datos
# Uso: ./scripts/add-workspace.sh "Workspace Name" "+34123456789"

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: ./scripts/add-workspace.sh \"Workspace Name\" \"+34123456789\""
    exit 1
fi

WORKSPACE_NAME=$1
PHONE_NUMBER=$2

echo "📝 Adding new workspace:"
echo "  Name: $WORKSPACE_NAME"
echo "  Phone: $PHONE_NUMBER"
echo ""

# Leer las credenciales de Supabase
if [ -f .env.local ]; then
    export $(cat .env.local | grep NEXT_PUBLIC_SUPABASE_URL | xargs)
    export $(cat .env.local | grep SUPABASE_SERVICE_ROLE_KEY | xargs)
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "⚠️  Supabase credentials not found in .env.local"
    exit 1
fi

# Hacer la petición a Supabase
curl -X POST "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/workspaces" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: return=representation" \
  -d "{\"name\": \"$WORKSPACE_NAME\", \"phone_number\": \"$PHONE_NUMBER\"}" \
  --silent | jq .

echo ""
echo "✅ Workspace added successfully!"
