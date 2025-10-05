import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = getServerSupabase();
    const workspaceId = parseInt(params.id);

    if (isNaN(workspaceId)) {
      return NextResponse.json({ success: false, error: 'Invalid workspace ID' }, { status: 400 });
    }

    // Obtener histórico de snapshots para el workspace
    const { data: snapshots, error: snapshotsError } = await supabase
      .from('call_snapshots')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('snapshot_date', { ascending: false })
      .limit(100); // Últimos 100 snapshots

    if (snapshotsError) {
      throw new Error(`Error fetching snapshots: ${snapshotsError.message}`);
    }

    return NextResponse.json({
      success: true,
      workspace_id: workspaceId,
      snapshots: snapshots || [],
    });
  } catch (error) {
    console.error('Error fetching workspace history:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
