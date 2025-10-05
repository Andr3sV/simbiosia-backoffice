import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getServerSupabase();

    console.log('📊 Fetching workspaces...');

    // Obtener todos los workspaces
    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select('*')
      .order('id', { ascending: true });

    if (workspacesError) {
      console.error('Error fetching workspaces:', workspacesError);
      throw new Error(`Error fetching workspaces: ${workspacesError.message}`);
    }

    console.log(`✅ Found ${workspaces?.length || 0} workspaces`);

    // Para cada workspace, obtener los últimos snapshots de Twilio y ElevenLabs
    const workspacesWithStats = await Promise.all(
      (workspaces || []).map(async (workspace) => {
        try {
          // Obtener último snapshot de Twilio
          const { data: twilioSnapshot } = await supabase
            .from('twilio_snapshots')
            .select('total_calls, total_cost, total_duration, snapshot_date')
            .eq('workspace_id', (workspace as any).id)
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Obtener último snapshot de ElevenLabs
          const { data: elevenlabsSnapshot } = await supabase
            .from('elevenlabs_snapshots')
            .select('total_conversations, total_cost, total_duration, snapshot_date')
            .eq('workspace_id', (workspace as any).id)
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .maybeSingle();

          // Combinar datos
          const twilioTotalCalls = (twilioSnapshot as any)?.total_calls || 0;
          const twilioTotalCost = parseFloat((twilioSnapshot as any)?.total_cost || '0');
          const elevenlabsTotalCalls = (elevenlabsSnapshot as any)?.total_conversations || 0;
          const elevenlabsTotalCost = parseFloat((elevenlabsSnapshot as any)?.total_cost || '0');

          return {
            ...workspace,
            latest_snapshot:
              twilioSnapshot || elevenlabsSnapshot
                ? {
                    twilio_total_calls: twilioTotalCalls,
                    twilio_total_cost: twilioTotalCost,
                    elevenlabs_total_calls: elevenlabsTotalCalls,
                    elevenlabs_total_cost: elevenlabsTotalCost,
                    combined_total_calls: twilioTotalCalls + elevenlabsTotalCalls,
                    combined_total_cost: twilioTotalCost + elevenlabsTotalCost,
                    snapshot_date:
                      twilioSnapshot?.snapshot_date || elevenlabsSnapshot?.snapshot_date,
                  }
                : null,
          };
        } catch (err) {
          console.error(`Exception fetching snapshots for workspace ${workspace.id}:`, err);
          return {
            ...workspace,
            latest_snapshot: null,
          };
        }
      })
    );

    console.log(`✅ Returning ${workspacesWithStats.length} workspaces with stats`);

    return NextResponse.json({
      success: true,
      workspaces: workspacesWithStats,
    });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
