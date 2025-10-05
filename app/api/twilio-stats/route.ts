import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabase();

    // Obtener el último snapshot de cada workspace desde twilio_snapshots
    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select('id');

    if (workspacesError) {
      console.error('Error fetching workspaces:', workspacesError);
      return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
    }

    let totalCalls = 0;
    let totalCost = 0;
    let totalDuration = 0;

    for (const workspace of workspaces || []) {
      const { data: snapshot } = await supabase
        .from('twilio_snapshots')
        .select('total_calls, total_cost, total_duration')
        .eq('workspace_id', workspace.id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (snapshot) {
        totalCalls += snapshot.total_calls || 0;
        totalCost += parseFloat(snapshot.total_cost || '0');
        totalDuration += parseInt(snapshot.total_duration || '0');
      }
    }

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
