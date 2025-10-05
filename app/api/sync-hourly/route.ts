import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import { getAllTwilioCalls } from '@/lib/services/twilio';

export async function POST(request: NextRequest) {
  try {
    // Verificar el secreto del cron job para seguridad
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServerSupabase();

    // Obtener datos de la última hora + 15 minutos de margen para evitar perder datos
    const now = new Date();
    const startDate = new Date(now.getTime() - 75 * 60 * 1000); // 1 hora 15 min atrás

    console.log(`📅 Syncing data from ${startDate.toISOString()} to ${now.toISOString()}`);

    // ==============================================
    // SINCRONIZAR LLAMADAS DE TWILIO
    // ==============================================
    console.log(`\n🔵 Fetching Twilio calls...`);
    const { callsByPhone: twilioCallsByPhone } = await getAllTwilioCalls(startDate);

    // Obtener todos los workspaces
    const { data: workspaces } = await supabase.from('workspaces').select('id');

    let twilioSaved = 0;
    const snapshotDate = new Date(now.getTime() - (now.getTime() % (60 * 60 * 1000))); // Redondear a la hora

    // Procesar cada workspace
    for (const workspace of workspaces || []) {
      // Obtener números asociados al workspace
      const { data: phones } = await supabase
        .from('workspace_phones')
        .select('phone_number')
        .eq('workspace_id', workspace.id);

      if (!phones || phones.length === 0) continue;

      let totalCalls = 0;
      let totalCost = 0;
      let totalDuration = 0;
      const callsToInsert = [];

      // Agregar datos de todos los números del workspace
      for (const phone of phones) {
        const twilioData = twilioCallsByPhone.get(phone.phone_number);
        if (twilioData) {
          totalCalls += twilioData.calls.length;
          twilioData.calls.forEach((call) => {
            totalCost += Math.abs(parseFloat(call.price || '0'));
            totalDuration += parseInt(call.duration || '0');
            callsToInsert.push({
              id: call.sid,
              workspace_id: workspace.id,
              source: 'twilio',
              provider: 'twilio',
              phone_from: call.from,
              phone_to: call.to,
              duration: call.duration,
              price: call.price,
              cost: Math.abs(parseFloat(call.price || '0')),
              status: call.status,
              call_date: call.startTime,
              raw_data: call,
            });
          });
        }
      }

      if (totalCalls > 0) {
        // Guardar snapshot de Twilio (upsert para evitar duplicados)
        await supabase.from('twilio_snapshots').upsert(
          {
            workspace_id: workspace.id,
            snapshot_date: snapshotDate.toISOString(),
            total_calls: totalCalls,
            total_cost: parseFloat(totalCost.toFixed(4)),
            total_duration: totalDuration,
          },
          { onConflict: 'workspace_id,snapshot_date' }
        );

        // Guardar llamadas individuales (upsert por ID para evitar duplicados)
        if (callsToInsert.length > 0) {
          await supabase.from('calls').upsert(callsToInsert, { onConflict: 'id' });
        }

        twilioSaved += totalCalls;
        console.log(
          `  ✅ Workspace ${workspace.id}: ${totalCalls} calls, $${totalCost.toFixed(
            4
          )}, ${totalDuration}s`
        );
      }
    }

    console.log(`\n✅ Twilio sync completed: ${twilioSaved} calls saved`);

    return NextResponse.json({
      success: true,
      synced_at: now.toISOString(),
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
      },
      summary: {
        twilio_calls_saved: twilioSaved,
      },
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
