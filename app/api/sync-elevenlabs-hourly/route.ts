import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Verificar el secreto del cron job para seguridad
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServerSupabase();

    // Obtener datos de la última hora + 15 minutos de margen
    const now = new Date();
    const startDate = new Date(now.getTime() - 75 * 60 * 1000); // 1 hora 15 min atrás
    const startTimestamp = Math.floor(startDate.getTime() / 1000);

    console.log(`📅 Syncing ElevenLabs data from ${startDate.toISOString()}`);

    // Obtener conversaciones de la última hora
    console.log('📞 Fetching ElevenLabs conversations...');

    const conversations = [];
    let cursor: string | null = null;
    let hasMore = true;

    while (hasMore) {
      const params: any = {
        page_size: 100,
      };

      if (cursor) {
        params.cursor = cursor;
      }

      const response = await axios.get(`https://api.elevenlabs.io/v1/convai/conversations`, {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
        params,
      });

      const pageConversations = response.data.conversations || [];

      // Filtrar solo las de la última hora
      const recentConversations = pageConversations.filter(
        (conv: any) => conv.start_time_unix_secs >= startTimestamp
      );

      conversations.push(...recentConversations);

      // Si ya no hay conversaciones recientes en esta página, detener
      if (recentConversations.length < pageConversations.length) {
        hasMore = false;
      } else {
        cursor = response.data.next_cursor || null;
        hasMore = !!cursor;
      }
    }

    console.log(`📊 Found ${conversations.length} conversations from last hour`);

    // Obtener detalles de cada conversación en batches
    const conversationDetails = [];
    const batchSize = 5;

    for (let i = 0; i < conversations.length; i += batchSize) {
      const batch = conversations.slice(i, i + batchSize);

      const batchDetails = await Promise.all(
        batch.map(async (conv) => {
          try {
            const response = await axios.get(
              `https://api.elevenlabs.io/v1/convai/conversations/${conv.conversation_id}`,
              {
                headers: {
                  'xi-api-key': process.env.ELEVENLABS_API_KEY!,
                },
                timeout: 10000,
              }
            );
            return response.data;
          } catch (error: any) {
            console.error(`  ❌ Error fetching ${conv.conversation_id}: ${error.message}`);
            return null;
          }
        })
      );

      conversationDetails.push(...batchDetails.filter((d) => d !== null));

      // Pausa entre batches
      if (i + batchSize < conversations.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`✅ Fetched ${conversationDetails.length} conversation details`);

    // Agrupar por workspace
    const workspaceStats = new Map();

    for (const conv of conversationDetails) {
      const agentNumber = conv.metadata?.phone_call?.agent_number;

      if (!agentNumber) continue;

      // Buscar el workspace por agent_number
      const { data: phoneData } = await supabase
        .from('workspace_phones')
        .select('workspace_id')
        .eq('phone_number', agentNumber)
        .single();

      if (!phoneData) continue;

      const workspaceId = (phoneData as any).workspace_id;

      if (!workspaceStats.has(workspaceId)) {
        workspaceStats.set(workspaceId, {
          conversations: [],
          totalConversations: 0,
          totalCost: 0,
          totalDuration: 0,
          llmPrice: 0,
          llmCharge: 0,
          callCharge: 0,
          freeMinutesConsumed: 0,
          freeLlmDollarsConsumed: 0,
          devDiscount: 0,
        });
      }

      const stats = workspaceStats.get(workspaceId);
      stats.conversations.push(conv);
      stats.totalConversations++;
      stats.totalCost += conv.metadata?.cost || 0;
      stats.totalDuration += conv.metadata?.call_duration_secs || 0;
      stats.llmPrice += conv.metadata?.charging?.llm_price || 0;
      stats.llmCharge += conv.metadata?.charging?.llm_charge || 0;
      stats.callCharge += conv.metadata?.charging?.call_charge || 0;
      stats.freeMinutesConsumed += conv.metadata?.charging?.free_minutes_consumed || 0;
      stats.freeLlmDollarsConsumed += conv.metadata?.charging?.free_llm_dollars_consumed || 0;
      stats.devDiscount += conv.metadata?.charging?.dev_discount || 0;

      // Guardar conversación individual (upsert)
      await supabase.from('elevenlabs_conversations').upsert(
        {
          conversation_id: conv.conversation_id,
          agent_id: conv.agent_id,
          status: conv.status,
          workspace_id: workspaceId,
          call_duration_secs: conv.metadata?.call_duration_secs || 0,
          cost: conv.metadata?.cost || 0,
          dev_discount: conv.metadata?.charging?.dev_discount || 0,
          is_burst: conv.metadata?.charging?.is_burst || false,
          llm_usage: conv.metadata?.charging?.llm_usage || null,
          llm_price: conv.metadata?.charging?.llm_price || 0,
          llm_charge: conv.metadata?.charging?.llm_charge || 0,
          call_charge: conv.metadata?.charging?.call_charge || 0,
          free_minutes_consumed: conv.metadata?.charging?.free_minutes_consumed || 0,
          free_llm_dollars_consumed: conv.metadata?.charging?.free_llm_dollars_consumed || 0,
          phone_number_id: conv.metadata?.phone_call?.phone_number_id || null,
          agent_number: conv.metadata?.phone_call?.agent_number || null,
          external_number: conv.metadata?.phone_call?.external_number || null,
          call_type: conv.metadata?.phone_call?.type || null,
          call_sid: conv.metadata?.phone_call?.call_sid || null,
          batch_call_id: conv.metadata?.batch_call?.batch_call_id || null,
          batch_call_recipient_id: conv.metadata?.batch_call?.batch_call_recipient_id || null,
          raw_data: conv,
          conversation_date: conv.metadata?.start_time_unix_secs
            ? new Date(conv.metadata.start_time_unix_secs * 1000).toISOString()
            : new Date().toISOString(),
        } as any,
        { onConflict: 'conversation_id' }
      );
    }

    // Guardar snapshots por workspace
    const snapshotDate = new Date(now.getTime() - (now.getTime() % (60 * 60 * 1000)));
    let snapshotsSaved = 0;

    for (const [workspaceId, stats] of Array.from(workspaceStats.entries())) {
      await supabase.from('elevenlabs_snapshots').upsert(
        {
          workspace_id: workspaceId,
          snapshot_date: snapshotDate.toISOString(),
          total_conversations: stats.totalConversations,
          total_cost: parseFloat(stats.totalCost.toFixed(4)),
          total_duration: stats.totalDuration,
          llm_usage: null, // Agregado si necesitas
          llm_price: parseFloat(stats.llmPrice.toFixed(4)),
          llm_charge: parseFloat(stats.llmCharge.toFixed(4)),
          call_charge: parseFloat(stats.callCharge.toFixed(4)),
          free_minutes_consumed: parseFloat(stats.freeMinutesConsumed.toFixed(4)),
          free_llm_dollars_consumed: parseFloat(stats.freeLlmDollarsConsumed.toFixed(4)),
          dev_discount: parseFloat(stats.devDiscount.toFixed(4)),
        },
        { onConflict: 'workspace_id,snapshot_date' }
      );

      snapshotsSaved++;
      console.log(
        `  ✅ Workspace ${workspaceId}: ${
          stats.totalConversations
        } conversations, $${stats.totalCost.toFixed(4)}`
      );
    }

    console.log(
      `\n✅ ElevenLabs sync completed: ${conversationDetails.length} conversations, ${snapshotsSaved} snapshots`
    );

    return NextResponse.json({
      success: true,
      synced_at: now.toISOString(),
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      summary: {
        conversations_processed: conversationDetails.length,
        snapshots_saved: snapshotsSaved,
      },
    });
  } catch (error) {
    console.error('ElevenLabs sync error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// También permitir GET para testing manual
export async function GET(request: NextRequest) {
  return POST(request);
}
