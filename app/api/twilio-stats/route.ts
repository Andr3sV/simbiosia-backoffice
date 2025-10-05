import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabase();

    // Obtener todos los snapshots más recientes agrupados por workspace usando una query SQL directa
    console.log('📊 Fetching latest Twilio snapshots...');

    const { data: snapshots, error: snapshotsError } = await supabase
      .from('twilio_snapshots')
      .select('workspace_id, total_calls, total_cost, total_duration, snapshot_date')
      .order('snapshot_date', { ascending: false });

    if (snapshotsError) {
      console.error('❌ Error fetching snapshots:', snapshotsError);
      return NextResponse.json(
        { error: `Failed to fetch snapshots: ${snapshotsError.message}` },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${snapshots?.length || 0} total snapshots`);

    if (!snapshots || snapshots.length === 0) {
      console.log('⚠️  No snapshots found in twilio_snapshots table');
      return NextResponse.json({
        success: true,
        data: {
          total_calls: 0,
          total_price: 0,
          total_duration_secs: 0,
          total_duration_formatted: '0h 0m 0s',
        },
      });
    }

    // Agrupar por workspace y tomar solo el más reciente de cada uno
    const latestByWorkspace = new Map();
    for (const snapshot of snapshots) {
      if (!latestByWorkspace.has((snapshot as any).workspace_id)) {
        latestByWorkspace.set((snapshot as any).workspace_id, snapshot);
      }
    }

    console.log(`📊 Latest snapshots per workspace: ${latestByWorkspace.size}`);

    // Calcular totales
    let totalCalls = 0;
    let totalCost = 0;
    let totalDuration = 0;

    for (const snapshot of latestByWorkspace.values()) {
      console.log(
        `  ✅ Workspace ${snapshot.workspace_id}: ${snapshot.total_calls} calls, $${snapshot.total_cost}`
      );
      totalCalls += snapshot.total_calls || 0;
      totalCost += parseFloat(snapshot.total_cost || '0');
      totalDuration += parseInt(snapshot.total_duration || '0');
    }

    console.log(`📈 Total: ${totalCalls} calls, $${totalCost.toFixed(2)}, ${totalDuration}s`);

    // Convertir duración de segundos a formato legible
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    const seconds = totalDuration % 60;

    return NextResponse.json({
      success: true,
      data: {
        total_calls: totalCalls,
        total_price: parseFloat(totalCost.toFixed(4)),
        total_duration_secs: totalDuration,
        total_duration_formatted: `${hours}h ${minutes}m ${seconds}s`,
      },
    });
  } catch (error) {
    console.error('Twilio stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
