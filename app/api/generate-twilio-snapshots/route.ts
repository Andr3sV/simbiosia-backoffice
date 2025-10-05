import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Verificar el secreto para seguridad (opcional para este endpoint)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📊 Iniciando generación de snapshots históricos de Twilio...');

    const supabase = getServerSupabase();

    // Obtener el conteo total de llamadas de Twilio
    console.log('📞 Contando llamadas de Twilio...');

    const { count, error: countError } = await supabase
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'twilio');

    if (countError) {
      console.error('❌ Error contando llamadas:', countError);
      return NextResponse.json({ success: false, error: countError.message }, { status: 500 });
    }

    const totalCalls = count || 0;
    console.log(`📊 Total de llamadas de Twilio: ${totalCalls}`);

    if (totalCalls === 0) {
      console.log('⚠️  No se encontraron llamadas de Twilio');
      return NextResponse.json({
        success: true,
        message: 'No calls found',
        snapshots_created: 0,
      });
    }

    // Obtener todas las llamadas en lotes
    console.log('📞 Obteniendo llamadas de Twilio en lotes...');
    let allCalls: any[] = [];
    const pageSize = 1000;
    let offset = 0;

    while (offset < totalCalls) {
      console.log(
        `  📦 Obteniendo lote ${Math.floor(offset / pageSize) + 1}/${Math.ceil(
          totalCalls / pageSize
        )} (${offset} - ${Math.min(offset + pageSize, totalCalls)})...`
      );

      const { data: batch, error: batchError } = await supabase
        .from('calls')
        .select('workspace_id, call_date, duration, cost')
        .eq('source', 'twilio')
        .order('call_date', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (batchError) {
        console.error(`  ❌ Error obteniendo lote en offset ${offset}:`, batchError);
        break;
      }

      if (batch && batch.length > 0) {
        allCalls = allCalls.concat(batch);
      }

      offset += pageSize;
    }

    const calls = allCalls;
    console.log(`✅ Obtenidas ${calls.length} llamadas de Twilio (de ${totalCalls} esperadas)`);

    // Agrupar llamadas por workspace y hora
    console.log('🔄 Agrupando llamadas por workspace y hora...');

    const snapshotMap = new Map<
      string,
      {
        workspace_id: number;
        snapshot_date: string;
        total_calls: number;
        total_cost: number;
        total_duration: number;
        real_minutes: number;
      }
    >();

    for (const call of calls as any[]) {
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
          real_minutes: 0,
        });
      }

      const snapshot = snapshotMap.get(key)!;
      snapshot.total_calls++;
      snapshot.total_cost += call.cost || 0;
      snapshot.total_duration += call.duration || 0;
      
      // Calcular minutos reales (redondear hacia arriba)
      // Si una llamada dura 1-60 seg = 1 minuto, 61-120 seg = 2 minutos, etc.
      const duration = call.duration || 0;
      if (duration > 0) {
        snapshot.real_minutes += Math.ceil(duration / 60);
      }
    }

    console.log(`✅ Generados ${snapshotMap.size} snapshots únicos`);

    // Convertir Map a array
    const snapshots = Array.from(snapshotMap.values()).map((snapshot) => ({
      workspace_id: snapshot.workspace_id,
      snapshot_date: snapshot.snapshot_date,
      total_calls: snapshot.total_calls,
      total_cost: parseFloat(snapshot.total_cost.toFixed(4)),
      total_duration: snapshot.total_duration,
      real_minutes: snapshot.real_minutes,
    }));

    console.log(`📝 Insertando ${snapshots.length} snapshots en la base de datos...`);

    // Insertar snapshots en lotes de 1000
    const batchSize = 1000;
    let inserted = 0;
    let updated = 0;

    for (let i = 0; i < snapshots.length; i += batchSize) {
      const batch = snapshots.slice(i, i + batchSize);

      console.log(
        `  📦 Procesando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          snapshots.length / batchSize
        )} (${batch.length} snapshots)...`
      );

      const { error: insertError } = await supabase.from('twilio_snapshots').upsert(batch as any, {
        onConflict: 'workspace_id,snapshot_date',
      });

      if (insertError) {
        console.error(`❌ Error insertando lote:`, insertError);
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
      }

      inserted += batch.length;
      console.log(`  ✅ Procesados ${inserted}/${snapshots.length} snapshots`);
    }

    console.log('\n📊 Resumen de snapshots creados:');

    // Agrupar por workspace para mostrar resumen
    const workspaceSummary = new Map<number, { count: number; calls: number; cost: number }>();

    for (const snapshot of snapshots) {
      if (!workspaceSummary.has(snapshot.workspace_id)) {
        workspaceSummary.set(snapshot.workspace_id, { count: 0, calls: 0, cost: 0 });
      }
      const summary = workspaceSummary.get(snapshot.workspace_id)!;
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
      .sort((a, b) => b.snapshots - a.snapshots)
      .slice(0, 10);

    console.table(summaryArray);

    const response = {
      success: true,
      total_calls_processed: calls.length,
      snapshots_created: snapshots.length,
      unique_workspaces: workspaceSummary.size,
      top_workspaces: summaryArray,
      date_range: {
        first_call: calls[0]?.call_date,
        last_call: calls[calls.length - 1]?.call_date,
      },
    };

    console.log('✅ Generación de snapshots completada exitosamente!');

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Error generando snapshots:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// También permitir GET para testing manual
export async function GET(request: NextRequest) {
  return POST(request);
}
