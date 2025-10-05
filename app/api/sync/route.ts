import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { getAllTwilioCalls } from '@/lib/services/twilio';
import {
  getAllElevenLabsCallsByPhone,
  getAllElevenLabsConversationsDetail,
} from '@/lib/services/elevenlabs';

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
    console.log(`📅 Fetching historical data from ${startDate.toISOString()}`);

    // Obtener TODAS las llamadas de Twilio desde el 1 de agosto
    console.log('🔵 Fetching Twilio calls...');
    const { callsByPhone: twilioCallsByPhone } = await getAllTwilioCalls(startDate);

    // Obtener TODAS las llamadas de ElevenLabs desde el 1 de agosto
    console.log('🟣 Fetching ElevenLabs conversations...');
    const { callsByPhone: elevenlabsCallsByPhone } = await getAllElevenLabsCallsByPhone(startDate);

    // Combinar todos los números únicos de workspace detectados
    const allWorkspaceNumbers = new Set<string>();
    twilioCallsByPhone.forEach((_, phone) => allWorkspaceNumbers.add(phone));
    elevenlabsCallsByPhone.forEach((_, phone) => {
      if (phone !== 'Unknown') allWorkspaceNumbers.add(phone);
    });

    console.log(`📱 Found ${allWorkspaceNumbers.size} unique workspace numbers`);

    const results = [];

    // Para cada workspace number detectado
    for (const workspaceNumber of Array.from(allWorkspaceNumbers)) {
      try {
        console.log(`\n📞 Processing workspace number: ${workspaceNumber}`);

        // Buscar si ya existe un workspace con este número
        const { data: existingPhone } = await supabase
          .from('workspace_phones')
          .select('workspace_id, workspaces(*)')
          .eq('phone_number', workspaceNumber)
          .single();

        let workspace: any;
        let isNewWorkspace = false;

        if (existingPhone && existingPhone.workspaces) {
          // El número ya existe y está asociado a un workspace
          workspace = existingPhone.workspaces;
          console.log(`  ✓ Found existing workspace: ${workspace.name} (ID: ${workspace.id})`);
        } else {
          // Crear un nuevo workspace para este número
          console.log(`  ➕ Creating new workspace for ${workspaceNumber}`);

          const { data: newWorkspace, error: createError } = await supabase
            .from('workspaces')
            .insert({
              name: `Workspace ${workspaceNumber}`,
              phone_number: workspaceNumber, // Por compatibilidad
            })
            .select()
            .single();

          if (createError) {
            console.error(`  ❌ Error creating workspace:`, createError);
            continue;
          }

          workspace = newWorkspace;
          isNewWorkspace = true;

          // Asociar el número al workspace
          await supabase.from('workspace_phones').insert({
            workspace_id: workspace.id,
            phone_number: workspaceNumber,
            is_primary: true,
          });
        }

        // Obtener datos de Twilio para este workspace
        const twilioData = twilioCallsByPhone.get(workspaceNumber) || { calls: [], totalCost: 0 };
        const twilioCalls = twilioData.calls.length;
        const twilioCost = twilioData.totalCost;
        const twilioDuration = twilioData.calls.reduce(
          (sum, call) => sum + parseInt(call.duration || '0'),
          0
        );

        // Obtener datos de ElevenLabs para este workspace
        const elevenlabsData = elevenlabsCallsByPhone.get(workspaceNumber) || {
          calls: [],
          totalCost: 0,
        };
        const elevenlabsCalls = elevenlabsData.calls.length;
        const elevenlabsCost = elevenlabsData.totalCost;
        const elevenlabsDuration = elevenlabsData.calls.reduce(
          (sum, call) => sum + (call.duration || 0),
          0
        );

        // Calcular totales combinados
        const combinedTotalCalls = twilioCalls + elevenlabsCalls;
        const combinedTotalCost = twilioCost + elevenlabsCost;

        console.log(`  📊 Twilio: ${twilioCalls} calls, $${twilioCost.toFixed(4)}`);
        console.log(`  📊 ElevenLabs: ${elevenlabsCalls} calls, $${elevenlabsCost.toFixed(4)}`);
        console.log(`  💰 Total: ${combinedTotalCalls} calls, $${combinedTotalCost.toFixed(4)}`);

        // Guardar snapshot en la base de datos
        const { data: snapshot, error: snapshotError } = await supabase
          .from('call_snapshots')
          .insert({
            workspace_id: workspace.id,
            snapshot_date: new Date().toISOString(),
            twilio_total_calls: twilioCalls,
            twilio_total_cost: twilioCost,
            twilio_total_duration: twilioDuration,
            twilio_raw_data: twilioData.calls as any,
            elevenlabs_total_calls: elevenlabsCalls,
            elevenlabs_total_cost: elevenlabsCost,
            elevenlabs_total_duration: elevenlabsDuration,
            elevenlabs_raw_data: elevenlabsData.calls as any,
            combined_total_calls: combinedTotalCalls,
            combined_total_cost: combinedTotalCost,
          })
          .select()
          .single();

        if (snapshotError) {
          console.error(`  ❌ Error saving snapshot:`, snapshotError);
          continue;
        }

        // Guardar llamadas individuales
        const callsToInsert = [
          ...twilioData.calls.map((call) => ({
            id: call.sid,
            workspace_id: workspace.id,
            source: 'twilio' as const,
            phone_from: call.from,
            phone_to: call.to,
            duration: parseInt(call.duration) || 0,
            cost: Math.abs(parseFloat(call.price)) || 0,
            status: call.status,
            call_date: call.startTime,
            raw_data: call as any,
          })),
          ...elevenlabsData.calls.map((call) => ({
            id: call.id,
            workspace_id: workspace.id,
            source: 'elevenlabs' as const,
            phone_from: call.from,
            phone_to: call.to,
            duration: call.duration,
            cost: call.cost,
            status: call.status,
            call_date: call.date.toISOString(),
            raw_data: call as any,
          })),
        ];

        if (callsToInsert.length > 0) {
          // Eliminar duplicados por ID en el mismo batch
          const uniqueCalls = Array.from(
            new Map(callsToInsert.map((call) => [call.id, call])).values()
          );

          console.log(
            `  📝 Inserting ${uniqueCalls.length} unique calls (${
              callsToInsert.length - uniqueCalls.length
            } duplicates removed)`
          );

          const { error: callsError } = await supabase
            .from('calls')
            .upsert(uniqueCalls, { onConflict: 'id' });

          if (callsError) {
            console.error(`  ❌ Error saving calls:`, callsError);
          } else {
            console.log(`  ✅ Saved ${uniqueCalls.length} individual call records`);
          }
        }

        results.push({
          workspace_id: workspace.id,
          workspace_name: workspace.name,
          workspace_number: workspaceNumber,
          is_new: isNewWorkspace,
          twilio_calls: twilioCalls,
          twilio_cost: twilioCost,
          elevenlabs_calls: elevenlabsCalls,
          elevenlabs_cost: elevenlabsCost,
          total_calls: combinedTotalCalls,
          total_cost: combinedTotalCost,
          snapshot_id: snapshot.id,
        });

        console.log(`  ✅ Synced workspace ${workspace.id} successfully`);
      } catch (error) {
        console.error(`❌ Error processing ${workspaceNumber}:`, error);
        results.push({
          workspace_number: workspaceNumber,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // ==============================================
    // SINCRONIZAR CONVERSACIONES DE ELEVENLABS
    // ==============================================
    console.log(`\n🟣 Syncing ElevenLabs conversations...`);

    const conversationDetails = await getAllElevenLabsConversationsDetail(startDate);
    console.log(`📊 Processing ${conversationDetails.length} ElevenLabs conversations`);

    let conversationsSaved = 0;
    let conversationsWithWorkspace = 0;

    for (const conv of conversationDetails) {
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
            workspaceId = phoneData.workspace_id;
            conversationsWithWorkspace++;
          }
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

          // Charging
          dev_discount: conv.metadata?.charging?.dev_discount || 0,
          is_burst: conv.metadata?.charging?.is_burst || false,
          llm_usage: conv.metadata?.charging?.llm_usage || 0,
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
          .upsert(conversationData, { onConflict: 'conversation_id' });

        if (convError) {
          console.error(`  ❌ Error saving conversation ${conv.conversation_id}:`, convError);
        } else {
          conversationsSaved++;
        }
      } catch (error) {
        console.error(`  ❌ Exception processing conversation ${conv.conversation_id}:`, error);
      }
    }

    console.log(`\n✅ ElevenLabs sync completed:`);
    console.log(`   Total conversations: ${conversationDetails.length}`);
    console.log(`   Conversations saved: ${conversationsSaved}`);
    console.log(`   Conversations with workspace: ${conversationsWithWorkspace}`);
    console.log(
      `   Conversations without workspace: ${
        conversationDetails.length - conversationsWithWorkspace
      }`
    );

    const summary = {
      total_workspaces: results.filter((r) => !r.error).length,
      new_workspaces: results.filter((r) => r.is_new).length,
      total_calls: results.reduce((sum, r) => sum + (r.total_calls || 0), 0),
      total_cost: results.reduce((sum, r) => sum + (r.total_cost || 0), 0),
      elevenlabs_conversations: conversationsSaved,
      elevenlabs_conversations_with_workspace: conversationsWithWorkspace,
    };

    console.log(`\n🎉 Sync completed!`);
    console.log(`   Total workspaces: ${summary.total_workspaces}`);
    console.log(`   New workspaces: ${summary.new_workspaces}`);
    console.log(`   Total calls: ${summary.total_calls}`);
    console.log(`   Total cost: $${summary.total_cost.toFixed(4)}`);
    console.log(`   ElevenLabs conversations: ${summary.elevenlabs_conversations}`);

    return NextResponse.json({
      success: true,
      synced_at: new Date().toISOString(),
      start_date: startDate.toISOString(),
      summary,
      results,
    });
  } catch (error) {
    console.error('Sync error:', error);
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
