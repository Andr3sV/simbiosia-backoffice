import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabase();
    
    // Obtener parámetros de fecha y workspace de la URL
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const workspaceId = searchParams.get('workspaceId');

    console.log('📊 Fetching Twilio snapshots...');
    if (startDate && endDate) {
      console.log(`📅 Date range: ${startDate} to ${endDate}`);
    } else {
      console.log('📅 No date filter - showing all historical data');
    }
    if (workspaceId && workspaceId !== 'all') {
      console.log(`🏢 Workspace filter: ${workspaceId}`);
    }

    // Construir query con filtros de fecha opcionales
    let query = supabase
      .from('twilio_snapshots')
      .select('workspace_id, total_calls, total_cost, total_duration, real_minutes, snapshot_date')
      .order('snapshot_date', { ascending: false });

    if (startDate && endDate) {
      query = query
        .gte('snapshot_date', startDate)
        .lte('snapshot_date', endDate);
    }

    // Aplicar filtro de workspace si se proporciona
    if (workspaceId && workspaceId !== 'all') {
      query = query.eq('workspace_id', parseInt(workspaceId));
    }

    const { data: snapshots, error: snapshotsError } = await query;

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
          total_real_minutes: 0,
          avg_seconds_per_call: 0,
        },
      });
    }

    // Sumar TODOS los snapshots (no solo el más reciente de cada workspace)
    console.log(`📊 Processing ${snapshots.length} snapshots...`);

    // Calcular totales sumando todos los snapshots
    let totalCalls = 0;
    let totalCost = 0;
    let totalDuration = 0;
    let totalRealMinutes = 0;

    for (const snapshot of snapshots) {
      totalCalls += (snapshot as any).total_calls || 0;
      totalCost += parseFloat((snapshot as any).total_cost || '0');
      totalDuration += parseInt((snapshot as any).total_duration || '0');
      totalRealMinutes += parseInt((snapshot as any).real_minutes || '0');
    }

    console.log(`📈 Total: ${totalCalls} calls, $${totalCost.toFixed(2)}, ${totalDuration}s`);

    // Convertir duración de segundos a formato legible
    const hours = Math.floor(totalDuration / 3600);
    const minutes = Math.floor((totalDuration % 3600) / 60);
    const seconds = totalDuration % 60;

    // Calcular promedio de segundos por llamada
    const avgSecondsPerCall = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

    // Agrupar snapshots por fecha para el gráfico
    const chartData = new Map<string, {
      date: string;
      calls: number;
      cost: number;
      duration: number;
      real_minutes: number;
    }>();

    for (const snapshot of snapshots) {
      const date = (snapshot as any).snapshot_date.split('T')[0]; // Solo la fecha (YYYY-MM-DD)
      
      if (!chartData.has(date)) {
        chartData.set(date, {
          date,
          calls: 0,
          cost: 0,
          duration: 0,
          real_minutes: 0,
        });
      }

      const dayData = chartData.get(date)!;
      dayData.calls += (snapshot as any).total_calls || 0;
      dayData.cost += parseFloat((snapshot as any).total_cost || '0');
      dayData.duration += parseInt((snapshot as any).total_duration || '0');
      dayData.real_minutes += parseInt((snapshot as any).real_minutes || '0');
    }

    // Convertir a array y ordenar por fecha
    const chartDataArray = Array.from(chartData.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(item => ({
        ...item,
        cost: parseFloat(item.cost.toFixed(4)),
      }));

    return NextResponse.json({
      success: true,
      data: {
        total_calls: totalCalls,
        total_price: parseFloat(totalCost.toFixed(4)),
        total_duration_secs: totalDuration,
        total_duration_formatted: `${hours}h ${minutes}m ${seconds}s`,
        total_real_minutes: totalRealMinutes,
        avg_seconds_per_call: avgSecondsPerCall,
        chart_data: chartDataArray,
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
