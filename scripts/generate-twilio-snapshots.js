#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateSnapshots() {
  try {
    console.log('📊 Iniciando generación de snapshots históricos de Twilio...\n');

    // Obtener todas las llamadas de Twilio
    console.log('📞 Obteniendo llamadas de Twilio...');
    
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('workspace_id, call_date, duration, cost')
      .eq('source', 'twilio')
      .order('call_date', { ascending: true });

    if (callsError) {
      console.error('❌ Error obteniendo llamadas:', callsError);
      process.exit(1);
    }

    if (!calls || calls.length === 0) {
      console.log('⚠️  No se encontraron llamadas de Twilio');
      process.exit(0);
    }

    console.log(`✅ Encontradas ${calls.length} llamadas de Twilio`);
    console.log(`   📅 Primera llamada: ${calls[0].call_date}`);
    console.log(`   📅 Última llamada: ${calls[calls.length - 1].call_date}\n`);

    // Agrupar llamadas por workspace y hora
    console.log('🔄 Agrupando llamadas por workspace y hora...');
    
    const snapshotMap = new Map();

    for (const call of calls) {
      // Truncar call_date a la hora (eliminar minutos, segundos)
      const callDate = new Date(call.call_date);
      callDate.setMinutes(0, 0, 0); // Poner minutos, segundos y ms a 0
      const hourKey = callDate.toISOString();
      
      // Crear clave única: workspace_id + hora
      const key = `${call.workspace_id}_${hourKey}`;
      
      if (!snapshotMap.has(key)) {
        snapshotMap.set(key, {
          workspace_id: call.workspace_id,
          snapshot_date: hourKey,
          total_calls: 0,
          total_cost: 0,
          total_duration: 0,
        });
      }
      
      const snapshot = snapshotMap.get(key);
      snapshot.total_calls++;
      snapshot.total_cost += call.cost || 0;
      snapshot.total_duration += call.duration || 0;
    }

    console.log(`✅ Generados ${snapshotMap.size} snapshots únicos\n`);

    // Convertir Map a array
    const snapshots = Array.from(snapshotMap.values()).map(snapshot => ({
      workspace_id: snapshot.workspace_id,
      snapshot_date: snapshot.snapshot_date,
      total_calls: snapshot.total_calls,
      total_cost: parseFloat(snapshot.total_cost.toFixed(4)),
      total_duration: snapshot.total_duration,
    }));

    console.log(`📝 Insertando ${snapshots.length} snapshots en la base de datos...`);

    // Insertar snapshots en lotes de 1000
    const batchSize = 1000;
    let inserted = 0;

    for (let i = 0; i < snapshots.length; i += batchSize) {
      const batch = snapshots.slice(i, i + batchSize);
      
      console.log(`  📦 Procesando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(snapshots.length / batchSize)} (${batch.length} snapshots)...`);
      
      const { error: insertError } = await supabase
        .from('twilio_snapshots')
        .upsert(batch, {
          onConflict: 'workspace_id,snapshot_date',
        });

      if (insertError) {
        console.error(`❌ Error insertando lote:`, insertError);
        process.exit(1);
      }

      inserted += batch.length;
      console.log(`  ✅ Procesados ${inserted}/${snapshots.length} snapshots`);
    }

    console.log('\n📊 Resumen de snapshots creados por workspace:');
    console.log('─'.repeat(70));
    
    // Agrupar por workspace para mostrar resumen
    const workspaceSummary = new Map();
    
    for (const snapshot of snapshots) {
      if (!workspaceSummary.has(snapshot.workspace_id)) {
        workspaceSummary.set(snapshot.workspace_id, { count: 0, calls: 0, cost: 0 });
      }
      const summary = workspaceSummary.get(snapshot.workspace_id);
      summary.count++;
      summary.calls += snapshot.total_calls;
      summary.cost += snapshot.total_cost;
    }

    const summaryArray = Array.from(workspaceSummary.entries())
      .map(([workspaceId, data]) => ({
        workspace_id: workspaceId,
        snapshots: data.count,
        total_calls: data.calls,
        total_cost: parseFloat(data.cost.toFixed(4)),
      }))
      .sort((a, b) => b.snapshots - a.snapshots);

    console.table(summaryArray.slice(0, 20));

    console.log('\n✅ Resumen final:');
    console.log('─'.repeat(50));
    console.log(`   📞 Total llamadas procesadas: ${calls.length}`);
    console.log(`   📊 Total snapshots creados: ${snapshots.length}`);
    console.log(`   🏢 Total workspaces: ${workspaceSummary.size}`);
    console.log(`   📅 Rango de fechas: ${calls[0].call_date} - ${calls[calls.length - 1].call_date}`);

    console.log('\n🎉 Generación de snapshots completada exitosamente!');
  } catch (error) {
    console.error('❌ Error generando snapshots:', error.message);
    process.exit(1);
  }
}

// Ejecutar generación
generateSnapshots();

