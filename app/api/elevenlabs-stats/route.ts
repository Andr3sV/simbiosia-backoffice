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

    console.log('📊 Fetching ElevenLabs snapshots...');
    if (startDate && endDate) {
      console.log(`📅 Date range: ${startDate} to ${endDate}`);
    } else {
      console.log('📅 No date filter - showing all historical data');
    }
    if (workspaceId && workspaceId !== 'all') {
      console.log(`🏢 Workspace filter: ${workspaceId}`);
    }

    // Construir query con filtros de fecha y workspace opcionales
    let query = supabase
      .from('elevenlabs_snapshots')
      .select(
        'workspace_id, total_conversations, total_cost, total_duration, llm_charge, call_charge, snapshot_date'
      )
      .order('snapshot_date', { ascending: false });

    if (startDate && endDate) {
      query = query.gte('snapshot_date', startDate).lte('snapshot_date', endDate);
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
      console.log('⚠️  No snapshots found in elevenlabs_snapshots table');
      return NextResponse.json({
        success: true,
        data: {
          total_conversations: 0,
          total_cost: 0,
          call_charges: 0,
          llm_charges: 0,
          cost_approx: 0,
          avg_call_duration: 0,
          chart_data: [],
        },
      });
    }

    // Sumar TODOS los snapshots (no solo el más reciente de cada workspace)
    console.log(`📊 Processing ${snapshots.length} snapshots...`);

    // Calcular totales sumando todos los snapshots
    let totalConversations = 0;
    let totalCost = 0;
    let totalCallCharges = 0;
    let totalLlmCharges = 0;
    let totalDuration = 0;

    for (const snapshot of snapshots) {
      totalConversations += (snapshot as any).total_conversations || 0;
      totalCost += parseFloat((snapshot as any).total_cost || '0');
      totalCallCharges += parseFloat((snapshot as any).call_charge || '0');
      totalLlmCharges += parseFloat((snapshot as any).llm_charge || '0');
      totalDuration += parseInt((snapshot as any).total_duration || '0');
    }

    console.log(
      `📈 Total: ${totalConversations} conversations, ${totalCost} credits, ${totalDuration}s`
    );

    // Calcular promedio de duración por conversación
    const avgCallDuration =
      totalConversations > 0 ? Math.round(totalDuration / totalConversations) : 0;

    // Calcular costo aproximado (Total cost * 0.00007525404654)
    const costApprox = totalCost * 0.00007525404654;

    // Agrupar snapshots por fecha para el gráfico
    const chartData = new Map<
      string,
      {
        date: string;
        conversations: number;
        cost: number;
        call_charges: number;
        llm_charges: number;
        duration: number;
      }
    >();

    for (const snapshot of snapshots) {
      const date = (snapshot as any).snapshot_date.split('T')[0]; // Solo la fecha (YYYY-MM-DD)

      if (!chartData.has(date)) {
        chartData.set(date, {
          date,
          conversations: 0,
          cost: 0,
          call_charges: 0,
          llm_charges: 0,
          duration: 0,
        });
      }

      const dayData = chartData.get(date)!;
      dayData.conversations += (snapshot as any).total_conversations || 0;
      dayData.cost += parseFloat((snapshot as any).total_cost || '0');
      dayData.call_charges += parseFloat((snapshot as any).call_charge || '0');
      dayData.llm_charges += parseFloat((snapshot as any).llm_charge || '0');
      dayData.duration += parseInt((snapshot as any).total_duration || '0');
    }

    // Convertir a array y ordenar por fecha
    const chartDataArray = Array.from(chartData.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((item) => ({
        ...item,
        cost: parseFloat(item.cost.toFixed(4)),
        call_charges: parseFloat(item.call_charges.toFixed(4)),
        llm_charges: parseFloat(item.llm_charges.toFixed(4)),
      }));

    return NextResponse.json({
      success: true,
      data: {
        total_conversations: totalConversations,
        total_cost: parseFloat(totalCost.toFixed(4)),
        call_charges: parseFloat(totalCallCharges.toFixed(4)),
        llm_charges: parseFloat(totalLlmCharges.toFixed(4)),
        cost_approx: parseFloat(costApprox.toFixed(6)),
        avg_call_duration: avgCallDuration,
        chart_data: chartDataArray,
      },
    });
  } catch (error) {
    console.error('ElevenLabs stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
