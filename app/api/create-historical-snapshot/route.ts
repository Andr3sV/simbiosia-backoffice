import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Verificar el secreto para seguridad
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServerSupabase();

    console.log('📊 Creating historical snapshot from existing calls...');

    // Obtener todos los workspaces
    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select('id');

    if (workspacesError) {
      throw new Error(`Error fetching workspaces: ${workspacesError.message}`);
    }

    console.log(`✅ Found ${workspaces?.length || 0} workspaces`);

    const results = [];
    const snapshotDate = new Date(); // Fecha actual para el snapshot histórico

    // Para cada workspace, calcular totales desde la tabla calls
    for (const workspace of (workspaces as Array<{ id: number }> | null) || []) {
      console.log(`\n📊 Processing workspace ${workspace.id}...`);

      // Obtener todas las llamadas de Twilio para este workspace
      // Nota: usar count para obtener el total real sin límite de 1000
      const { count, error: countError } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspace.id)
        .eq('source', 'twilio');

      if (countError) {
        console.error(`  ❌ Error counting calls for workspace ${workspace.id}:`, countError);
        continue;
      }

      // Obtener todas las llamadas en lotes si hay más de 1000
      let allCalls: any[] = [];
      const pageSize = 1000;
      let offset = 0;
      const totalToFetch = count || 0;

      while (offset < totalToFetch) {
        const { data: batch, error: batchError } = await supabase
          .from('calls')
          .select('cost, duration')
          .eq('workspace_id', workspace.id)
          .eq('source', 'twilio')
          .range(offset, offset + pageSize - 1);

        if (batchError) {
          console.error(`  ❌ Error fetching batch at offset ${offset}:`, batchError);
          break;
        }

        if (batch) {
          allCalls = allCalls.concat(batch);
        }

        offset += pageSize;
      }

      const calls = allCalls;

      console.log(`  📞 Found ${calls?.length || 0} calls for workspace ${workspace.id} (expected: ${count})`);

      if (!calls || calls.length === 0) {
        console.log(`  ⚠️  No calls found for workspace ${workspace.id}`);
        continue;
      }

      // Calcular totales
      const totalCalls = calls.length;
      let totalCost = 0;
      let totalDuration = 0;

      for (const call of calls) {
        // Usar el campo cost directamente
        const callCost = parseFloat(call.cost || '0');
        totalCost += callCost;
        totalDuration += parseInt(call.duration || '0');
      }

      console.log(`  📊 Workspace ${workspace.id}:`);
      console.log(`     Calls: ${totalCalls}`);
      console.log(`     Cost: $${totalCost.toFixed(4)}`);
      console.log(`     Duration: ${totalDuration}s`);

      // Crear snapshot histórico
      const { error: snapshotError } = await supabase.from('twilio_snapshots').upsert(
        {
          workspace_id: workspace.id,
          snapshot_date: snapshotDate.toISOString(),
          total_calls: totalCalls,
          total_cost: parseFloat(totalCost.toFixed(4)),
          total_duration: totalDuration,
        },
        { onConflict: 'workspace_id,snapshot_date' }
      );

      if (snapshotError) {
        console.error(`  ❌ Error creating snapshot for workspace ${workspace.id}:`, snapshotError);
        results.push({
          workspace_id: workspace.id,
          success: false,
          error: snapshotError.message,
        });
      } else {
        console.log(`  ✅ Snapshot created successfully`);
        results.push({
          workspace_id: workspace.id,
          success: true,
          total_calls: totalCalls,
          total_cost: parseFloat(totalCost.toFixed(4)),
          total_duration: totalDuration,
        });
      }
    }

    // Calcular totales generales
    const successfulSnapshots = results.filter((r) => r.success);
    const totalCallsAll = successfulSnapshots.reduce((sum, r) => sum + (r.total_calls || 0), 0);
    const totalCostAll = successfulSnapshots.reduce((sum, r) => sum + (r.total_cost || 0), 0);
    const totalDurationAll = successfulSnapshots.reduce(
      (sum, r) => sum + (r.total_duration || 0),
      0
    );

    console.log('\n🎉 Historical snapshot creation completed!');
    console.log(`   Workspaces processed: ${workspaces?.length || 0}`);
    console.log(`   Snapshots created: ${successfulSnapshots.length}`);
    console.log(`   Total calls: ${totalCallsAll}`);
    console.log(`   Total cost: $${totalCostAll.toFixed(4)}`);
    console.log(`   Total duration: ${totalDurationAll}s`);

    return NextResponse.json({
      success: true,
      snapshot_date: snapshotDate.toISOString(),
      summary: {
        workspaces_processed: workspaces?.length || 0,
        snapshots_created: successfulSnapshots.length,
        total_calls: totalCallsAll,
        total_cost: parseFloat(totalCostAll.toFixed(4)),
        total_duration: totalDurationAll,
        formatted_duration: formatDuration(totalDurationAll),
      },
      results,
    });
  } catch (error) {
    console.error('Historical snapshot error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours}h ${minutes}m ${secs}s`;
}

// También permitir GET para testing manual
export async function GET(request: NextRequest) {
  return POST(request);
}
