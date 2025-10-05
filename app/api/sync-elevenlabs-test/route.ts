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

    console.log(`🧪 TEST: Fetching last 10 ElevenLabs conversations...`);

    // Obtener solo las últimas 10 conversaciones
    const response = await axios.get(
      `https://api.elevenlabs.io/v1/convai/conversations`,
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
        },
        params: {
          page_size: 10,
        },
      }
    );

    const conversations = response.data.conversations || [];
    console.log(`📊 Found ${conversations.length} conversations to test`);

    let conversationsSaved = 0;
    let conversationsWithWorkspace = 0;
    let conversationsWithoutWorkspace = 0;
    const errors = [];
    const savedConversations = [];

    for (const conv of conversations) {
      try {
        console.log(`\n📞 Processing conversation: ${conv.conversation_id}`);
        
        // Obtener detalles completos de la conversación
        const detailResponse = await axios.get(
          `https://api.elevenlabs.io/v1/convai/conversations/${conv.conversation_id}`,
          {
            headers: {
              'xi-api-key': process.env.ELEVENLABS_API_KEY!,
            },
          }
        );

        const convDetail = detailResponse.data;
        
        // Log de la estructura para debug
        console.log(`  📋 Metadata structure:`, {
          has_metadata: !!convDetail.metadata,
          has_phone_call: !!convDetail.metadata?.phone_call,
          agent_number: convDetail.metadata?.phone_call?.agent_number,
          has_charging: !!convDetail.metadata?.charging,
          llm_usage_type: typeof convDetail.metadata?.charging?.llm_usage,
        });

        // Determinar el workspace basándose en agent_number
        const agentNumber = convDetail.metadata?.phone_call?.agent_number;
        let workspaceId: number | null = null;

        if (agentNumber) {
          const { data: phoneData } = await supabase
            .from('workspace_phones')
            .select('workspace_id')
            .eq('phone_number', agentNumber)
            .single();

          if (phoneData) {
            workspaceId = (phoneData as any).workspace_id;
            conversationsWithWorkspace++;
            console.log(`  ✅ Found workspace ${workspaceId} for agent_number ${agentNumber}`);
          } else {
            conversationsWithoutWorkspace++;
            console.log(`  ⚠️  No workspace found for agent_number: ${agentNumber}`);
          }
        } else {
          conversationsWithoutWorkspace++;
          console.log(`  ⚠️  Conversation has no agent_number`);
        }

        // Preparar los datos para insertar
        const conversationData = {
          conversation_id: convDetail.conversation_id,
          agent_id: convDetail.agent_id,
          status: convDetail.status,
          workspace_id: workspaceId,
          
          // Metadata
          call_duration_secs: convDetail.metadata?.call_duration_secs || 0,
          cost: convDetail.metadata?.cost || 0,
          
          // Charging - llm_usage ahora es JSONB
          dev_discount: convDetail.metadata?.charging?.dev_discount || 0,
          is_burst: convDetail.metadata?.charging?.is_burst || false,
          llm_usage: convDetail.metadata?.charging?.llm_usage || null,
          llm_price: convDetail.metadata?.charging?.llm_price || 0,
          llm_charge: convDetail.metadata?.charging?.llm_charge || 0,
          call_charge: convDetail.metadata?.charging?.call_charge || 0,
          free_minutes_consumed: convDetail.metadata?.charging?.free_minutes_consumed || 0,
          free_llm_dollars_consumed: convDetail.metadata?.charging?.free_llm_dollars_consumed || 0,
          
          // Phone Call
          phone_number_id: convDetail.metadata?.phone_call?.phone_number_id || null,
          agent_number: convDetail.metadata?.phone_call?.agent_number || null,
          external_number: convDetail.metadata?.phone_call?.external_number || null,
          call_type: convDetail.metadata?.phone_call?.type || null,
          call_sid: convDetail.metadata?.phone_call?.call_sid || null,
          
          // Batch Call
          batch_call_id: convDetail.metadata?.batch_call?.batch_call_id || null,
          batch_call_recipient_id: convDetail.metadata?.batch_call?.batch_call_recipient_id || null,
          
          // Raw data y fecha
          raw_data: convDetail,
          conversation_date: convDetail.metadata?.start_time_unix_secs 
            ? new Date(convDetail.metadata.start_time_unix_secs * 1000).toISOString()
            : new Date().toISOString(),
        };

        // Insertar o actualizar la conversación
        const { error: convError } = await supabase
          .from('elevenlabs_conversations')
          .upsert(conversationData as any, { onConflict: 'conversation_id' });

        if (convError) {
          console.error(`  ❌ Error saving conversation:`, convError);
          errors.push({
            conversation_id: convDetail.conversation_id,
            error: convError.message,
          });
        } else {
          conversationsSaved++;
          savedConversations.push({
            id: convDetail.conversation_id,
            agent_number: agentNumber,
            workspace_id: workspaceId,
            cost: convDetail.metadata?.cost || 0,
            call_charge: convDetail.metadata?.charging?.call_charge || 0,
            llm_charge: convDetail.metadata?.charging?.llm_charge || 0,
          });
          console.log(`  ✅ Saved successfully`);
        }
      } catch (error) {
        console.error(`  ❌ Exception:`, error);
        errors.push({
          conversation_id: conv.conversation_id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const summary = {
      total_conversations: conversations.length,
      conversations_saved: conversationsSaved,
      conversations_with_workspace: conversationsWithWorkspace,
      conversations_without_workspace: conversationsWithoutWorkspace,
      errors_count: errors.length,
    };

    console.log(`\n🎉 TEST completed!`);
    console.log(`   Total: ${summary.total_conversations}`);
    console.log(`   Saved: ${summary.conversations_saved}`);
    console.log(`   With workspace: ${summary.conversations_with_workspace}`);
    console.log(`   Without workspace: ${summary.conversations_without_workspace}`);
    console.log(`   Errors: ${summary.errors_count}`);

    return NextResponse.json({
      success: true,
      synced_at: new Date().toISOString(),
      summary,
      saved_conversations: savedConversations,
      errors,
    });
  } catch (error) {
    console.error('TEST sync error:', error);
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
