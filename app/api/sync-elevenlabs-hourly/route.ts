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

    console.log('🔄 Iniciando sincronización diaria de ElevenLabs...');

    // Sincronizar últimas 24 horas exactas (sin margen para evitar duplicados)
    const now = new Date();
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 horas atrás
    const startTimestamp = Math.floor(startDate.getTime() / 1000);

    console.log(`📅 Periodo: ${startDate.toISOString()} - ${now.toISOString()}`);

    // Obtener conversaciones de las últimas 24 horas
    console.log('💬 Obteniendo conversaciones de ElevenLabs (últimas 24 horas)...');

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

    // Generar snapshots por workspace y hora
    console.log('\n📊 Generando snapshots por hora...');

    const snapshotMap = new Map<
      string,
      {
        workspace_id: number;
        snapshot_date: string;
        total_conversations: number;
        total_cost: number;
        total_duration: number;
        llm_price: number;
        llm_charge: number;
        call_charge: number;
        free_minutes_consumed: number;
        free_llm_dollars_consumed: number;
        dev_discount: number;
      }
    >();

    // Agrupar las conversaciones guardadas por workspace y hora
    for (const [workspaceId, stats] of Array.from(workspaceStats.entries())) {
      for (const conv of stats.conversations) {
        // Truncar conversation_date a la hora (eliminar minutos, segundos)
        const convDate = new Date(
          conv.metadata?.start_time_unix_secs
            ? conv.metadata.start_time_unix_secs * 1000
            : Date.now()
        );
        convDate.setMinutes(0, 0, 0); // Poner minutos, segundos y ms a 0
        const hourKey = convDate.toISOString();

        // Crear clave única: workspace_id + hora
        const key = `${workspaceId}_${hourKey}`;

        if (!snapshotMap.has(key)) {
          snapshotMap.set(key, {
            workspace_id: workspaceId,
            snapshot_date: hourKey,
            total_conversations: 0,
            total_cost: 0,
            total_duration: 0,
            llm_price: 0,
            llm_charge: 0,
            call_charge: 0,
            free_minutes_consumed: 0,
            free_llm_dollars_consumed: 0,
            dev_discount: 0,
          });
        }

        const snapshot = snapshotMap.get(key)!;
        snapshot.total_conversations++;
        snapshot.total_cost += conv.metadata?.cost || 0;
        snapshot.total_duration += conv.metadata?.call_duration_secs || 0;
        snapshot.llm_price += conv.metadata?.charging?.llm_price || 0;
        snapshot.llm_charge += conv.metadata?.charging?.llm_charge || 0;
        snapshot.call_charge += conv.metadata?.charging?.call_charge || 0;
        snapshot.free_minutes_consumed += conv.metadata?.charging?.free_minutes_consumed || 0;
        snapshot.free_llm_dollars_consumed +=
          conv.metadata?.charging?.free_llm_dollars_consumed || 0;
        snapshot.dev_discount += conv.metadata?.charging?.dev_discount || 0;
      }
    }

    // Convertir Map a array y formatear
    const snapshots = Array.from(snapshotMap.values()).map((snapshot) => ({
      workspace_id: snapshot.workspace_id,
      snapshot_date: snapshot.snapshot_date,
      total_conversations: snapshot.total_conversations,
      total_cost: parseFloat(snapshot.total_cost.toFixed(4)),
      total_duration: snapshot.total_duration,
      llm_usage: null,
      llm_price: parseFloat(snapshot.llm_price.toFixed(4)),
      llm_charge: parseFloat(snapshot.llm_charge.toFixed(4)),
      call_charge: parseFloat(snapshot.call_charge.toFixed(4)),
      free_minutes_consumed: parseFloat(snapshot.free_minutes_consumed.toFixed(4)),
      free_llm_dollars_consumed: parseFloat(snapshot.free_llm_dollars_consumed.toFixed(4)),
      dev_discount: parseFloat(snapshot.dev_discount.toFixed(4)),
    }));

    let snapshotsSaved = 0;
    if (snapshots.length > 0) {
      console.log(`  📊 Insertando ${snapshots.length} snapshots...`);

      const { error: snapshotError } = await supabase
        .from('elevenlabs_snapshots')
        .upsert(snapshots as any, {
          onConflict: 'workspace_id,snapshot_date',
        });

      if (snapshotError) {
        console.error('  ❌ Error insertando snapshots:', snapshotError);
      } else {
        snapshotsSaved = snapshots.length;
        console.log(`  ✅ Guardados ${snapshotsSaved} snapshots`);
      }
    }

    console.log('\n🎉 Sincronización diaria de ElevenLabs completada!');
    console.log(`💬 Total conversaciones procesadas: ${conversationDetails.length}`);
    console.log(`📊 Total snapshots creados/actualizados: ${snapshotsSaved}`);

    return NextResponse.json({
      success: true,
      synced_at: now.toISOString(),
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        hours: 24,
      },
      summary: {
        conversations_processed: conversationDetails.length,
        snapshots_created: snapshotsSaved,
      },
      message: 'Sincronización diaria completada con snapshots (24 horas)',
    });
  } catch (error) {
    console.error('Error en sincronización diaria de ElevenLabs:', error);
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
