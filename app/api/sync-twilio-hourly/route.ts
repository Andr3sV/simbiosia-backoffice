import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';
import twilio from 'twilio';

const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

interface TwilioCall {
  sid: string;
  from: string;
  to: string;
  duration: string;
  status: string;
  direction: string;
  startTime: Date | null;
  endTime: Date | null;
  price: string | null;
  priceUnit: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar el secreto para seguridad
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServerSupabase();

    console.log('🔄 Iniciando sincronización diaria de Twilio...');

    // Sincronizar últimas 24 horas exactas (sin margen para evitar duplicados)
    const now = new Date();
    const startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 horas atrás

    let totalCalls = 0;
    let savedCalls = 0;
    let createdPhones = 0;
    let case1Count = 0;
    let case2Count = 0;
    let case3Count = 0;

    console.log(`📅 Periodo: ${startDate.toISOString()} - ${now.toISOString()}`);

    // Obtener todos los números de workspace
    const { data: workspacePhones } = await supabase
      .from('workspace_phones')
      .select('phone_number, workspace_id');

    const phoneToWorkspace = new Map<string, number>();
    (workspacePhones as Array<{ phone_number: string; workspace_id: number }> | null)?.forEach(
      (wp) => {
        phoneToWorkspace.set(wp.phone_number, wp.workspace_id);
      }
    );

    console.log(`📱 Mapa de ${phoneToWorkspace.size} números a workspaces cargado`);

    // Almacenar todas las llamadas
    const allCalls: TwilioCall[] = [];

    // Obtener llamadas de Twilio (últimas 24 horas)
    console.log('📞 Obteniendo llamadas de las últimas 24 horas...');

    const callsPage: any = await twilioClient.calls.list({
      startTimeAfter: startDate,
      pageSize: 1000, // Paginación automática manejada por Twilio SDK
    });

    if (callsPage && callsPage.length > 0) {
      totalCalls = callsPage.length;
      console.log(`  📞 ${callsPage.length} llamadas obtenidas`);

      callsPage.forEach((call: any) => {
        allCalls.push({
          sid: call.sid,
          from: call.from,
          to: call.to,
          duration: call.duration || '0',
          status: call.status,
          direction: call.direction,
          startTime: call.startTime,
          endTime: call.endTime,
          price: call.price,
          priceUnit: call.priceUnit || 'USD',
        });
      });
    } else {
      console.log('  ℹ️ No hay llamadas nuevas en las últimas 24 horas');
      return NextResponse.json({
        success: true,
        totalCalls: 0,
        savedCalls: 0,
        snapshotsCreated: 0,
        message: 'No hay llamadas nuevas',
      });
    }

    console.log(`\n📊 Procesando ${allCalls.length} llamadas...`);

    // Separar llamadas por tipo
    const case1and2Calls = allCalls.filter(
      (call) => call.direction === 'outbound-api' || call.direction === 'trunking-terminating'
    );
    const case3Calls = allCalls.filter((call) => call.direction === 'trunking-originating');

    console.log(`  📤 Caso 1&2 (outbound-api/trunking-terminating): ${case1and2Calls.length}`);
    console.log(`  📥 Caso 3 (trunking-originating): ${case3Calls.length}`);

    const callsToInsert = [];

    // Procesar casos 1 y 2
    for (const call of case1and2Calls) {
      const phoneFrom = call.from;
      let workspaceId = phoneToWorkspace.get(phoneFrom);

      // Si el número no existe, crearlo con workspace_id = 1
      if (!workspaceId) {
        console.log(`  ➕ Creando número de workspace: ${phoneFrom}`);

        const { error: insertPhoneError } = await supabase.from('workspace_phones').insert({
          workspace_id: 1,
          phone_number: phoneFrom,
          is_primary: false,
        } as any);

        if (!insertPhoneError) {
          phoneToWorkspace.set(phoneFrom, 1);
          workspaceId = 1;
          createdPhones++;
        } else {
          workspaceId = 1;
        }
      }

      if (call.direction === 'outbound-api') {
        case1Count++;
      } else {
        case2Count++;
      }

      callsToInsert.push({
        id: call.sid,
        workspace_id: workspaceId,
        source: 'twilio' as const,
        phone_from: call.from,
        phone_to: call.to,
        duration: parseInt(call.duration) || 0,
        cost: call.price ? Math.abs(parseFloat(call.price)) : 0,
        status: call.status,
        call_date: call.startTime || new Date(),
        raw_data: {
          sid: call.sid,
          from: call.from,
          to: call.to,
          duration: call.duration,
          status: call.status,
          direction: call.direction,
          startTime: call.startTime,
          endTime: call.endTime,
          price: call.price,
          priceUnit: call.priceUnit,
        },
      });
    }

    // Procesar caso 3
    for (const call of case3Calls) {
      const leadPhone = call.from;
      const callEndTime = call.endTime;

      if (!callEndTime) {
        case3Count++;
        callsToInsert.push({
          id: call.sid,
          workspace_id: 1,
          source: 'twilio' as const,
          phone_from: call.from,
          phone_to: call.to,
          duration: parseInt(call.duration) || 0,
          cost: call.price ? Math.abs(parseFloat(call.price)) : 0,
          status: call.status,
          call_date: call.startTime || new Date(),
          raw_data: {
            sid: call.sid,
            from: call.from,
            to: call.to,
            duration: call.duration,
            status: call.status,
            direction: call.direction,
            startTime: call.startTime,
            endTime: call.endTime,
            price: call.price,
            priceUnit: call.priceUnit,
          },
        });
        continue;
      }

      // Buscar en TODAS las llamadas caso 1 y 2 donde TO = leadPhone
      const matchingCalls = case1and2Calls.filter((c) => c.to === leadPhone && c.endTime);

      let workspaceId = 1;

      if (matchingCalls.length > 0) {
        // Encontrar la más cercana en tiempo
        const closestCall = matchingCalls.reduce((closest, current) => {
          const closestDiff = Math.abs(closest.endTime!.getTime() - callEndTime.getTime());
          const currentDiff = Math.abs(current.endTime!.getTime() - callEndTime.getTime());
          return currentDiff < closestDiff ? current : closest;
        });

        const workspacePhone = closestCall.from;
        workspaceId = phoneToWorkspace.get(workspacePhone) || 1;

        if (!phoneToWorkspace.has(workspacePhone)) {
          const { error: insertPhoneError } = await supabase.from('workspace_phones').insert({
            workspace_id: 1,
            phone_number: workspacePhone,
            is_primary: false,
          } as any);

          if (!insertPhoneError) {
            phoneToWorkspace.set(workspacePhone, 1);
            createdPhones++;
          }
        }
      }

      case3Count++;

      callsToInsert.push({
        id: call.sid,
        workspace_id: workspaceId,
        source: 'twilio' as const,
        phone_from: call.from,
        phone_to: call.to,
        duration: parseInt(call.duration) || 0,
        cost: call.price ? Math.abs(parseFloat(call.price)) : 0,
        status: call.status,
        call_date: call.startTime || new Date(),
        raw_data: {
          sid: call.sid,
          from: call.from,
          to: call.to,
          duration: call.duration,
          status: call.status,
          direction: call.direction,
          startTime: call.startTime,
          endTime: call.endTime,
          price: call.price,
          priceUnit: call.priceUnit,
        },
      });
    }

    // Insertar todas las llamadas
    if (callsToInsert.length > 0) {
      console.log(`\n💾 Insertando ${callsToInsert.length} llamadas...`);

      const { error: insertError, data: inserted } = await supabase
        .from('calls')
        .upsert(callsToInsert as any, { onConflict: 'id' })
        .select('id');

      if (insertError) {
        console.error('  ❌ Error insertando llamadas:', insertError);
      } else {
        savedCalls = inserted?.length || 0;
        console.log(`  ✅ Guardadas ${savedCalls} llamadas`);
      }
    }

    // Generar snapshots por workspace y hora
    console.log('\n📊 Generando snapshots por hora...');

    const snapshotMap = new Map<
      string,
      {
        workspace_id: number;
        snapshot_date: string;
        total_calls: number;
        total_cost: number;
        total_duration: number;
        real_minutes: number;
      }
    >();

    for (const call of callsToInsert) {
      // Truncar call_date a la hora (eliminar minutos, segundos)
      const callDate = new Date(call.call_date);
      callDate.setMinutes(0, 0, 0); // Poner minutos, segundos y ms a 0
      const hourKey = callDate.toISOString();

      // Crear clave única: workspace_id + hora
      const key = `${call.workspace_id}_${hourKey}`;

      if (!snapshotMap.has(key)) {
        snapshotMap.set(key, {
          workspace_id: call.workspace_id,
          snapshot_date: hourKey,
          total_calls: 0,
          total_cost: 0,
          total_duration: 0,
          real_minutes: 0,
        });
      }

      const snapshot = snapshotMap.get(key)!;
      snapshot.total_calls++;
      snapshot.total_cost += call.cost || 0;
      snapshot.total_duration += call.duration || 0;
      
      // Calcular minutos reales (redondear hacia arriba)
      // Si una llamada dura 1-60 seg = 1 minuto, 61-120 seg = 2 minutos, etc.
      const duration = call.duration || 0;
      if (duration > 0) {
        snapshot.real_minutes += Math.ceil(duration / 60);
      }
    }

    // Convertir Map a array
    const snapshots = Array.from(snapshotMap.values()).map((snapshot) => ({
      workspace_id: snapshot.workspace_id,
      snapshot_date: snapshot.snapshot_date,
      total_calls: snapshot.total_calls,
      total_cost: parseFloat(snapshot.total_cost.toFixed(4)),
      total_duration: snapshot.total_duration,
      real_minutes: snapshot.real_minutes,
    }));

    let snapshotsCreated = 0;
    if (snapshots.length > 0) {
      console.log(`  📊 Insertando ${snapshots.length} snapshots...`);

      const { error: snapshotError } = await supabase
        .from('twilio_snapshots')
        .upsert(snapshots as any, {
          onConflict: 'workspace_id,snapshot_date',
        });

      if (snapshotError) {
        console.error('  ❌ Error insertando snapshots:', snapshotError);
      } else {
        snapshotsCreated = snapshots.length;
        console.log(`  ✅ Guardados ${snapshotsCreated} snapshots`);
      }
    }

    console.log('\n🎉 Sincronización diaria completada!');
    console.log(`📊 Total llamadas obtenidas: ${totalCalls}`);
    console.log(`  📤 Caso 1 (outbound-api): ${case1Count}`);
    console.log(`  📤 Caso 2 (trunking-terminating): ${case2Count}`);
    console.log(`  📥 Caso 3 (trunking-originating): ${case3Count}`);
    console.log(`💾 Total llamadas guardadas: ${savedCalls}`);
    console.log(`📊 Total snapshots creados/actualizados: ${snapshotsCreated}`);
    console.log(`📱 Números de workspace creados: ${createdPhones}`);

    return NextResponse.json({
      success: true,
      synced_at: now.toISOString(),
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        hours: 24,
      },
      totalCalls,
      savedCalls,
      snapshotsCreated,
      createdPhones,
      case1Count,
      case2Count,
      case3Count,
      message: 'Sincronización diaria completada con snapshots (24 horas)',
    });
  } catch (error) {
    console.error('Error en sincronización diaria:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Permitir GET para testing manual
export async function GET(request: NextRequest) {
  return POST(request);
}
