// Script para buscar un número de teléfono en las llamadas
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Leer .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function searchPhone(phoneNumber) {
  console.log(`\n🔍 Buscando número: ${phoneNumber}\n`);
  console.log('═'.repeat(80));

  // Normalizar número (agregar + si no lo tiene)
  const searchPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
  
  // 1. Buscar en phone_to
  console.log('\n📞 1. LLAMADAS DONDE phone_to = ' + searchPhone + '\n');
  
  const { data: callsTo, error: errorTo } = await supabase
    .from('calls')
    .select('id, workspace_id, phone_from, phone_to, raw_data, duration, cost, status, call_date, workspaces(name)')
    .or(`phone_to.eq.${searchPhone},phone_to.like.%${phoneNumber}`)
    .eq('source', 'twilio')
    .gte('call_date', '2025-08-01')
    .order('call_date', { ascending: false });

  if (callsTo && callsTo.length > 0) {
    // Agrupar por dirección
    const byDirection = {};
    callsTo.forEach(call => {
      const dir = call.raw_data?.direction || 'unknown';
      if (!byDirection[dir]) byDirection[dir] = [];
      byDirection[dir].push(call);
    });

    console.log(`Total: ${callsTo.length} llamadas encontradas\n`);
    
    Object.keys(byDirection).forEach(direction => {
      const calls = byDirection[direction];
      console.log(`\n  📊 ${direction}: ${calls.length} llamadas`);
      
      calls.slice(0, 5).forEach(call => {
        const ws = call.workspaces?.name || `WS ${call.workspace_id}`;
        console.log(`     - ${call.id.substring(0, 15)}... | WS: ${ws} | From: ${call.phone_from} | ${call.call_date.substring(0, 10)}`);
      });
      
      if (calls.length > 5) {
        console.log(`     ... y ${calls.length - 5} más`);
      }
    });
  } else {
    console.log('❌ No se encontraron llamadas con este número en phone_to');
  }

  // 2. Buscar en phone_from
  console.log('\n\n📞 2. LLAMADAS DONDE phone_from = ' + searchPhone + '\n');
  
  const { data: callsFrom, error: errorFrom } = await supabase
    .from('calls')
    .select('id, workspace_id, phone_from, phone_to, raw_data, duration, cost, status, call_date, workspaces(name)')
    .or(`phone_from.eq.${searchPhone},phone_from.like.%${phoneNumber}`)
    .eq('source', 'twilio')
    .gte('call_date', '2025-08-01')
    .order('call_date', { ascending: false });

  if (callsFrom && callsFrom.length > 0) {
    const byDirection = {};
    callsFrom.forEach(call => {
      const dir = call.raw_data?.direction || 'unknown';
      if (!byDirection[dir]) byDirection[dir] = [];
      byDirection[dir].push(call);
    });

    console.log(`Total: ${callsFrom.length} llamadas encontradas\n`);
    
    Object.keys(byDirection).forEach(direction => {
      const calls = byDirection[direction];
      console.log(`\n  📊 ${direction}: ${calls.length} llamadas`);
      
      calls.slice(0, 5).forEach(call => {
        const ws = call.workspaces?.name || `WS ${call.workspace_id}`;
        console.log(`     - ${call.id.substring(0, 15)}... | WS: ${ws} | To: ${call.phone_to} | ${call.call_date.substring(0, 10)}`);
      });
      
      if (calls.length > 5) {
        console.log(`     ... y ${calls.length - 5} más`);
      }
    });
  } else {
    console.log('❌ No se encontraron llamadas con este número en phone_from');
  }

  // 3. Verificar si está en workspace_phones
  console.log('\n\n📱 3. ¿ESTÁ EN WORKSPACE_PHONES?\n');
  
  const { data: wsPhones } = await supabase
    .from('workspace_phones')
    .select('id, workspace_id, phone_number, is_primary, created_at, workspaces(name)')
    .or(`phone_number.eq.${searchPhone},phone_number.like.%${phoneNumber}`);

  if (wsPhones && wsPhones.length > 0) {
    wsPhones.forEach(phone => {
      console.log(`   ✅ Sí - Workspace ${phone.workspace_id} (${phone.workspaces?.name})`);
      console.log(`      Número: ${phone.phone_number}`);
      console.log(`      Primary: ${phone.is_primary ? 'Sí' : 'No'}`);
      console.log(`      Creado: ${new Date(phone.created_at).toLocaleString('es-ES')}`);
    });
  } else {
    console.log('   ❌ No - No está registrado como número de workspace');
  }

  console.log('\n' + '═'.repeat(80) + '\n');
}

// Obtener número del argumento de línea de comandos
const phoneNumber = process.argv[2] || '34648728251';
searchPhone(phoneNumber).catch(console.error);
