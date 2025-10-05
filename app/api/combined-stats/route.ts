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

    console.log('📊 Fetching combined stats...');
    if (startDate && endDate) {
      console.log(`📅 Date range: ${startDate} to ${endDate}`);
    } else {
      console.log('📅 No date filter - showing all historical data');
    }
    if (workspaceId && workspaceId !== 'all') {
      console.log(`🏢 Workspace filter: ${workspaceId}`);
    }

    // Construir query para Twilio con filtros opcionales
    let twilioQuery = supabase
      .from('twilio_snapshots')
      .select('workspace_id, total_calls, total_cost, real_minutes, snapshot_date')
      .order('snapshot_date', { ascending: false });

    if (startDate && endDate) {
      twilioQuery = twilioQuery
        .gte('snapshot_date', startDate)
        .lte('snapshot_date', endDate);
    }

    if (workspaceId && workspaceId !== 'all') {
      twilioQuery = twilioQuery.eq('workspace_id', parseInt(workspaceId));
    }

    const { data: twilioSnapshots, error: twilioError } = await twilioQuery;

    if (twilioError) {
      console.error('❌ Error fetching Twilio snapshots:', twilioError);
      return NextResponse.json(
        { error: `Failed to fetch Twilio snapshots: ${twilioError.message}` },
        { status: 500 }
      );
    }

    // Construir query para ElevenLabs con filtros opcionales
    let elevenlabsQuery = supabase
      .from('elevenlabs_snapshots')
      .select('workspace_id, total_cost, snapshot_date')
      .order('snapshot_date', { ascending: false });

    if (startDate && endDate) {
      elevenlabsQuery = elevenlabsQuery
        .gte('snapshot_date', startDate)
        .lte('snapshot_date', endDate);
    }

    if (workspaceId && workspaceId !== 'all') {
      elevenlabsQuery = elevenlabsQuery.eq('workspace_id', parseInt(workspaceId));
    }

    const { data: elevenlabsSnapshots, error: elevenlabsError } = await elevenlabsQuery;

    if (elevenlabsError) {
      console.error('❌ Error fetching ElevenLabs snapshots:', elevenlabsError);
      return NextResponse.json(
        { error: `Failed to fetch ElevenLabs snapshots: ${elevenlabsError.message}` },
        { status: 500 }
      );
    }

    console.log(`📊 Found ${twilioSnapshots?.length || 0} Twilio snapshots and ${elevenlabsSnapshots?.length || 0} ElevenLabs snapshots`);

    if (!twilioSnapshots || twilioSnapshots.length === 0) {
      console.log('⚠️  No snapshots found');
      return NextResponse.json({
        success: true,
        data: {
          total_calls: 0,
          total_costs: 0,
          total_minutes: 0,
          twilio_cost: 0,
          elevenlabs_cost_usd: 0,
          elevenlabs_credits: 0,
          chart_data: [],
        },
      });
    }

    // Calcular totales de Twilio
    let totalTwilioCalls = 0;
    let totalTwilioCost = 0;
    let totalTwilioMinutes = 0;

    for (const snapshot of twilioSnapshots) {
      totalTwilioCalls += (snapshot as any).total_calls || 0;
      totalTwilioCost += parseFloat((snapshot as any).total_cost || '0');
      totalTwilioMinutes += parseInt((snapshot as any).real_minutes || '0');
    }

    // Calcular totales de ElevenLabs
    let totalElevenLabsCost = 0;

    for (const snapshot of elevenlabsSnapshots || []) {
      totalElevenLabsCost += parseFloat((snapshot as any).total_cost || '0');
    }

    // Convertir créditos de ElevenLabs a USD (multiplicar por 0.00007525404654)
    const elevenLabsCostUSD = totalElevenLabsCost * 0.00007525404654;

    // Calcular costos combinados
    const totalCombinedCost = totalTwilioCost + elevenLabsCostUSD;

    console.log(`📈 Twilio: ${totalTwilioCalls} calls, $${totalTwilioCost.toFixed(2)}, ${totalTwilioMinutes} minutes`);
    console.log(`📈 ElevenLabs: ${totalElevenLabsCost.toFixed(2)} credits, $${elevenLabsCostUSD.toFixed(6)} USD`);
    console.log(`📈 Combined: $${totalCombinedCost.toFixed(2)}`);

    // Agrupar snapshots por fecha para el gráfico
    const chartData = new Map<string, {
      date: string;
      calls: number;
      cost: number;
      minutes: number;
    }>();

    // Procesar snapshots de Twilio
    for (const snapshot of twilioSnapshots) {
      const date = (snapshot as any).snapshot_date.split('T')[0]; // Solo la fecha (YYYY-MM-DD)
      
      if (!chartData.has(date)) {
        chartData.set(date, {
          date,
          calls: 0,
          cost: 0,
          minutes: 0,
        });
      }

      const dayData = chartData.get(date)!;
      dayData.calls += (snapshot as any).total_calls || 0;
      dayData.cost += parseFloat((snapshot as any).total_cost || '0');
      dayData.minutes += parseInt((snapshot as any).real_minutes || '0');
    }

    // Procesar snapshots de ElevenLabs para agregar costos
    for (const snapshot of elevenlabsSnapshots || []) {
      const date = (snapshot as any).snapshot_date.split('T')[0];
      const elevenLabsCost = parseFloat((snapshot as any).total_cost || '0') * 0.00007525404654;
      
      if (chartData.has(date)) {
        const dayData = chartData.get(date)!;
        dayData.cost += elevenLabsCost;
      } else {
        chartData.set(date, {
          date,
          calls: 0,
          cost: elevenLabsCost,
          minutes: 0,
        });
      }
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
        total_calls: totalTwilioCalls,
        total_costs: parseFloat(totalCombinedCost.toFixed(2)),
        total_minutes: totalTwilioMinutes,
        twilio_cost: parseFloat(totalTwilioCost.toFixed(2)),
        elevenlabs_cost_usd: parseFloat(elevenLabsCostUSD.toFixed(6)),
        elevenlabs_credits: parseFloat(totalElevenLabsCost.toFixed(2)),
        chart_data: chartDataArray,
      },
    });
  } catch (error) {
    console.error('Combined stats error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
