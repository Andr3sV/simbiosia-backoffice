import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = getServerSupabase();

    console.log('🏢 Fetching workspaces list...');

    // Obtener workspaces únicos de los snapshots
    const { data: workspaces, error } = await supabase
      .from('twilio_snapshots')
      .select('workspace_id')
      .order('workspace_id', { ascending: true });

    if (error) {
      console.error('❌ Error fetching workspaces:', error);
      return NextResponse.json(
        { error: `Failed to fetch workspaces: ${error.message}` },
        { status: 500 }
      );
    }

    // Obtener workspaces únicos
    const uniqueWorkspaces = Array.from(
      new Set(workspaces?.map((w: any) => w.workspace_id) || [])
    ).map(id => ({
      id: id,
      name: `Workspace ${id}`
    }));

    console.log(`✅ Found ${uniqueWorkspaces.length} workspaces`);

    return NextResponse.json({
      success: true,
      data: uniqueWorkspaces,
    });
  } catch (error) {
    console.error('Workspaces list error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
