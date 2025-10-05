import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = getServerSupabase();

    // Obtener el último snapshot de cada workspace desde elevenlabs_snapshots
    const { data: workspaces, error: workspacesError } = await supabase
      .from('workspaces')
      .select('id');

    if (workspacesError) {
      console.error('Error fetching workspaces:', workspacesError);
      return NextResponse.json({ error: 'Failed to fetch workspaces' }, { status: 500 });
    }

    let totalConversations = 0;
    let totalCost = 0;
    let totalDuration = 0;
    let totalLlmPrice = 0;
    let totalLlmCharge = 0;
    let totalCallCharge = 0;
    let totalFreeMinutesConsumed = 0;
    let totalFreeLlmDollarsConsumed = 0;
    let totalDevDiscount = 0;

    for (const workspace of (workspaces as Array<{ id: number }> | null) || []) {
      const { data: snapshot } = await supabase
        .from('elevenlabs_snapshots')
        .select(
          'total_conversations, total_cost, total_duration, llm_price, llm_charge, call_charge, free_minutes_consumed, free_llm_dollars_consumed, dev_discount'
        )
        .eq('workspace_id', workspace.id)
        .order('snapshot_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (snapshot) {
        const s = snapshot as any;
        totalConversations += s.total_conversations || 0;
        totalCost += parseFloat(s.total_cost || '0');
        totalDuration += parseInt(s.total_duration || '0');
        totalLlmPrice += parseFloat(s.llm_price || '0');
        totalLlmCharge += parseFloat(s.llm_charge || '0');
        totalCallCharge += parseFloat(s.call_charge || '0');
        totalFreeMinutesConsumed += parseFloat(s.free_minutes_consumed || '0');
        totalFreeLlmDollarsConsumed += parseFloat(s.free_llm_dollars_consumed || '0');
        totalDevDiscount += parseFloat(s.dev_discount || '0');
      }
    }

    // Obtener el conteo de conversaciones totales con y sin workspace
    const { data: allConversations } = await supabase
      .from('elevenlabs_conversations')
      .select('workspace_id');

    const conversationsWithWorkspace =
      (allConversations as any)?.filter((c: any) => c.workspace_id !== null).length || 0;
    const conversationsWithoutWorkspace =
      allConversations?.filter((c) => c.workspace_id === null).length || 0;

    return NextResponse.json({
      success: true,
      total_conversations: totalConversations,
      total_cost: parseFloat(totalCost.toFixed(4)),
      total_llm_price: parseFloat(totalLlmPrice.toFixed(4)),
      total_llm_charge: parseFloat(totalLlmCharge.toFixed(4)),
      total_call_charge: parseFloat(totalCallCharge.toFixed(4)),
      total_call_duration_secs: totalDuration,
      free_minutes_consumed: parseFloat(totalFreeMinutesConsumed.toFixed(4)),
      free_llm_dollars_consumed: parseFloat(totalFreeLlmDollarsConsumed.toFixed(4)),
      dev_discount: parseFloat(totalDevDiscount.toFixed(4)),
      conversations_with_workspace: conversationsWithWorkspace,
      conversations_without_workspace: conversationsWithoutWorkspace,
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
