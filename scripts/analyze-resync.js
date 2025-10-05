// Script para analizar los resultados de la resincronización de Twilio
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeResyncResults() {
  console.log('📊 ANÁLISIS DE RESINCRONIZACIÓN DE TWILIO\n');
  console.log('═'.repeat(80));

  // 1. DISTRIBUCIÓN POR WORKSPACE
  console.log('\n📈 1. DISTRIBUCIÓN DE LLAMADAS POR WORKSPACE\n');
  const { data: distribution, error: distError } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT 
        w.id,
        w.name,
        COUNT(c.id) as total_calls,
        ROUND(SUM(c.cost)::numeric, 2) as total_cost,
        ROUND(SUM(c.duration)::numeric / 3600, 2) as hours,
        COUNT(CASE WHEN c.raw_data->>'direction' = 'outbound-api' THEN 1 END) as outbound_api,
        COUNT(CASE WHEN c.raw_data->>'direction' = 'trunking-terminating' THEN 1 END) as trunking_term,
        COUNT(CASE WHEN c.raw_data->>'direction' = 'trunking-originating' THEN 1 END) as trunking_orig
      FROM workspaces w
      LEFT JOIN calls c ON c.workspace_id = w.id 
        AND c.source = 'twilio'
        AND c.call_date >= '2025-08-01'
      GROUP BY w.id, w.name
      HAVING COUNT(c.id) > 0
      ORDER BY total_calls DESC
    `
  });

  // Alternativa: query directa
  const { data: workspaceStats } = await supabase
    .from('calls')
    .select('workspace_id, cost, duration, raw_data')
    .eq('source', 'twilio')
    .gte('call_date', '2025-08-01');

  if (workspaceStats) {
    // Agrupar por workspace
    const grouped = {};
    
    workspaceStats.forEach(call => {
      const wsId = call.workspace_id;
      if (!grouped[wsId]) {
        grouped[wsId] = {
          workspace_id: wsId,
          total_calls: 0,
          total_cost: 0,
          total_duration: 0,
          outbound_api: 0,
          trunking_terminating: 0,
          trunking_originating: 0
        };
      }
      
      grouped[wsId].total_calls++;
      grouped[wsId].total_cost += parseFloat(call.cost) || 0;
      grouped[wsId].total_duration += parseInt(call.duration) || 0;
      
      const direction = call.raw_data?.direction;
      if (direction === 'outbound-api') grouped[wsId].outbound_api++;
      else if (direction === 'trunking-terminating') grouped[wsId].trunking_terminating++;
      else if (direction === 'trunking-originating') grouped[wsId].trunking_originating++;
    });

    // Obtener nombres de workspaces
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id, name');
    
    const wsMap = {};
    workspaces?.forEach(ws => {
      wsMap[ws.id] = ws.name;
    });

    // Ordenar por cantidad de llamadas
    const sorted = Object.values(grouped).sort((a, b) => b.total_calls - a.total_calls);

    console.log('┌────┬─────────────────────────────┬───────┬─────────┬────────┬─────────┬──────────┬──────────┐');
    console.log('│ ID │ Workspace                   │ Calls │ Cost($) │ Hours  │ Out-API │ Trunk-T  │ Trunk-O  │');
    console.log('├────┼─────────────────────────────┼───────┼─────────┼────────┼─────────┼──────────┼──────────┤');
    
    sorted.forEach(ws => {
      const name = wsMap[ws.workspace_id] || `Workspace ${ws.workspace_id}`;
      const truncName = name.length > 27 ? name.substring(0, 24) + '...' : name;
      const hours = (ws.total_duration / 3600).toFixed(1);
      
      console.log(
        `│ ${String(ws.workspace_id).padStart(2)} │ ${truncName.padEnd(27)} │ ` +
        `${String(ws.total_calls).padStart(5)} │ ` +
        `${ws.total_cost.toFixed(2).padStart(7)} │ ` +
        `${String(hours).padStart(6)} │ ` +
        `${String(ws.outbound_api).padStart(7)} │ ` +
        `${String(ws.trunking_terminating).padStart(8)} │ ` +
        `${String(ws.trunking_originating).padStart(8)} │`
      );
    });
    
    console.log('└────┴─────────────────────────────┴───────┴─────────┴────────┴─────────┴──────────┴──────────┘');

    // Totales
    const totals = sorted.reduce((acc, ws) => {
      acc.calls += ws.total_calls;
      acc.cost += ws.total_cost;
      acc.duration += ws.total_duration;
      acc.outbound_api += ws.outbound_api;
      acc.trunking_terminating += ws.trunking_terminating;
      acc.trunking_originating += ws.trunking_originating;
      return acc;
    }, { calls: 0, cost: 0, duration: 0, outbound_api: 0, trunking_terminating: 0, trunking_originating: 0 });

    console.log('\n📊 TOTALES:');
    console.log(`   Total Workspaces: ${sorted.length}`);
    console.log(`   Total Llamadas:   ${totals.calls.toLocaleString()}`);
    console.log(`   Total Costo:      $${totals.cost.toFixed(2)}`);
    console.log(`   Total Horas:      ${(totals.duration / 3600).toFixed(1)}h`);
    console.log(`   Caso 1 (Out-API): ${totals.outbound_api.toLocaleString()}`);
    console.log(`   Caso 2 (Trunk-T): ${totals.trunking_terminating.toLocaleString()}`);
    console.log(`   Caso 3 (Trunk-O): ${totals.trunking_originating.toLocaleString()}`);
  }

  // 2. NÚMEROS CREADOS
  console.log('\n\n📱 2. NÚMEROS DE WORKSPACE CREADOS EN LA ÚLTIMA HORA\n');
  
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const { data: newPhones } = await supabase
    .from('workspace_phones')
    .select('id, workspace_id, phone_number, is_primary, created_at, workspaces(name)')
    .gte('created_at', oneHourAgo)
    .order('created_at', { ascending: false });

  if (newPhones && newPhones.length > 0) {
    console.log('┌──────────────────┬──────┬─────────────────────────────┬──────────┬────────────────────┐');
    console.log('│ Número           │ WS   │ Workspace Name              │ Primary  │ Creado             │');
    console.log('├──────────────────┼──────┼─────────────────────────────┼──────────┼────────────────────┤');
    
    newPhones.forEach(phone => {
      const wsName = phone.workspaces?.name || 'Unknown';
      const truncName = wsName.length > 27 ? wsName.substring(0, 24) + '...' : wsName;
      const created = new Date(phone.created_at).toLocaleTimeString('es-ES');
      
      console.log(
        `│ ${phone.phone_number.padEnd(16)} │ ` +
        `${String(phone.workspace_id).padStart(4)} │ ` +
        `${truncName.padEnd(27)} │ ` +
        `${(phone.is_primary ? 'Sí' : 'No').padStart(8)} │ ` +
        `${created.padEnd(18)} │`
      );
    });
    
    console.log('└──────────────────┴──────┴─────────────────────────────┴──────────┴────────────────────┘');
    console.log(`\nTotal: ${newPhones.length} números creados`);
  } else {
    console.log('No se crearon números nuevos en la última hora.');
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ Análisis completado\n');
}

analyzeResyncResults().catch(console.error);
