import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { getElevenLabsConversationsList } from '@/lib/services/elevenlabs';
import axios from 'axios';

export async function POST(request: NextRequest) {
  try {
    // Verificar el secreto del cron job para seguridad
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServerSupabase();

    // Fecha de inicio: 1 de agosto de 2025
    const startDate = new Date('2025-08-01T00:00:00Z');
    console.log(`📅 Fetching ElevenLabs conversations from ${startDate.toISOString()}`);

    // ==============================================
    // SINCRONIZAR CONVERSACIONES DE ELEVENLABS
    // ==============================================
    console.log(`\n🟣 Syncing ElevenLabs conversations...`);
    
    // Obtener IDs de conversaciones
    const conversationIds = await getElevenLabsConversationsList(startDate);
    console.log(`📊 Found ${conversationIds.length} conversation IDs to process`);

    let conversationsSaved = 0;
    let conversationsWithWorkspace = 0;
    let conversationsWithoutWorkspace = 0;
    let conversationsProcessed = 0;
    const errors = [];

    // Procesar y guardar en lotes pequeños
    const batchSize = 5;
    
    for (let i = 0; i < conversationIds.length; i += batchSize) {
      const batch = conversationIds.slice(i, i + batchSize);
      
      // Obtener detalles del lote con retry logic
      const batchDetails = await Promise.all(
        batch.map(async (conversationId) => {
          let retries = 0;
          const maxRetries = 3;
          
          while (retries < maxRetries) {
            try {
              const response = await axios.get(
                `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
                {
                  headers: {
                    'xi-api-key': process.env.ELEVENLABS_API_KEY!,
                  },
                  timeout: 10000,
                }
              );
              return response.data;
            } catch (error: any) {
              if (error.response?.status === 429) {
                retries++;
                const waitTime = Math.pow(2, retries) * 1000;
                console.log(`  ⏳ Rate limited on ${conversationId}, waiting ${waitTime}ms...`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
              } else {
                console.error(`  ❌ Error fetching ${conversationId}: ${error.response?.status || error.message}`);
                return null;
              }
            }
          }
          
          console.error(`  ❌ Failed ${conversationId} after ${maxRetries} retries`);
          return null;
        })
      );

      // Guardar inmediatamente cada conversación del lote
      for (const conv of batchDetails) {
        if (!conv) {
          conversationsProcessed++;
          continue;
        }
        
        conversationsProcessed++;
      try {
        // Determinar el workspace basándose en agent_number
        const agentNumber = conv.metadata?.phone_call?.agent_number;
        let workspaceId: number | null = null;

        if (agentNumber) {
          // Buscar el workspace por el agent_number
          const { data: phoneData } = await supabase
            .from('workspace_phones')
            .select('workspace_id')
            .eq('phone_number', agentNumber)
            .single();

          if (phoneData) {
            workspaceId = (phoneData as any).workspace_id;
            conversationsWithWorkspace++;
          } else {
            conversationsWithoutWorkspace++;
            console.log(`  ⚠️  No workspace found for agent_number: ${agentNumber}`);
          }
        } else {
          conversationsWithoutWorkspace++;
        }

        // Preparar los datos para insertar
        const conversationData = {
          conversation_id: conv.conversation_id,
          agent_id: conv.agent_id,
          status: conv.status,
          workspace_id: workspaceId,

          // Metadata
          call_duration_secs: conv.metadata?.call_duration_secs || 0,
          cost: conv.metadata?.cost || 0,

          // Charging - llm_usage ahora es JSONB
          dev_discount: conv.metadata?.charging?.dev_discount || 0,
          is_burst: conv.metadata?.charging?.is_burst || false,
          llm_usage: conv.metadata?.charging?.llm_usage || null,
          llm_price: conv.metadata?.charging?.llm_price || 0,
          llm_charge: conv.metadata?.charging?.llm_charge || 0,
          call_charge: conv.metadata?.charging?.call_charge || 0,
          free_minutes_consumed: conv.metadata?.charging?.free_minutes_consumed || 0,
          free_llm_dollars_consumed: conv.metadata?.charging?.free_llm_dollars_consumed || 0,

          // Phone Call
          phone_number_id: conv.metadata?.phone_call?.phone_number_id || null,
          agent_number: conv.metadata?.phone_call?.agent_number || null,
          external_number: conv.metadata?.phone_call?.external_number || null,
          call_type: conv.metadata?.phone_call?.type || null,
          call_sid: conv.metadata?.phone_call?.call_sid || null,

          // Batch Call
          batch_call_id: conv.metadata?.batch_call?.batch_call_id || null,
          batch_call_recipient_id: conv.metadata?.batch_call?.batch_call_recipient_id || null,

          // Raw data y fecha
          raw_data: conv,
          conversation_date: conv.metadata?.start_time_unix_secs
            ? new Date(conv.metadata.start_time_unix_secs * 1000).toISOString()
            : new Date().toISOString(),
        };

        // Insertar o actualizar la conversación
        const { error: convError } = await supabase
          .from('elevenlabs_conversations')
          .upsert(conversationData as any, { onConflict: 'conversation_id' });

        if (convError) {
          console.error(`  ❌ Error saving conversation ${conv.conversation_id}:`, convError);
          errors.push({
            conversation_id: conv.conversation_id,
            error: convError.message,
          });
        } else {
          conversationsSaved++;
        }
      } catch (error) {
        console.error(`  ❌ Exception processing conversation ${conv.conversation_id}:`, error);
        errors.push({
          conversation_id: conv.conversation_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      }

      // Mostrar progreso cada 50 conversaciones o al final
      if (conversationsProcessed % 50 === 0 || i + batchSize >= conversationIds.length) {
        console.log(`  📊 Progress: ${conversationsProcessed}/${conversationIds.length} processed, ${conversationsSaved} saved`);
      }

      // Pausa entre lotes para evitar rate limiting
      if (i + batchSize < conversationIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5 segundos entre lotes
      }
    }

    // Calcular estadísticas de costos
    const { data: costStats } = await supabase
      .from('elevenlabs_conversations')
      .select('cost, call_charge, llm_charge');

    const totalCost = costStats?.reduce((sum, conv) => sum + (conv.cost || 0), 0) || 0;
    const totalCallCharge = costStats?.reduce((sum, conv) => sum + (conv.call_charge || 0), 0) || 0;
    const totalLlmCharge = costStats?.reduce((sum, conv) => sum + (conv.llm_charge || 0), 0) || 0;

    const summary = {
      total_conversation_ids: conversationIds.length,
      conversations_processed: conversationsProcessed,
      conversations_saved: conversationsSaved,
      conversations_with_workspace: conversationsWithWorkspace,
      conversations_without_workspace: conversationsWithoutWorkspace,
      total_cost: parseFloat(totalCost.toFixed(4)),
      total_call_charge: parseFloat(totalCallCharge.toFixed(4)),
      total_llm_charge: parseFloat(totalLlmCharge.toFixed(4)),
      errors_count: errors.length,
    };

    console.log(`\n🎉 ElevenLabs sync completed!`);
    console.log(`   Total IDs found: ${summary.total_conversation_ids}`);
    console.log(`   Conversations processed: ${summary.conversations_processed}`);
    console.log(`   Conversations saved: ${summary.conversations_saved}`);
    console.log(`   With workspace: ${summary.conversations_with_workspace}`);
    console.log(`   Without workspace: ${summary.conversations_without_workspace}`);
    console.log(`   Total cost: $${summary.total_cost}`);
    console.log(`   Call charge: $${summary.total_call_charge}`);
    console.log(`   LLM charge: $${summary.total_llm_charge}`);
    console.log(`   Errors: ${summary.errors_count}`);

    return NextResponse.json({
      success: true,
      synced_at: new Date().toISOString(),
      start_date: startDate.toISOString(),
      summary,
      errors: errors.length > 0 ? errors.slice(0, 10) : [], // Solo primeros 10 errores
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
