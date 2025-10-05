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

    console.log('🔄 Iniciando resincronización histórica de Twilio desde Agosto 1, 2025...');

    const startDate = new Date('2025-08-01T00:00:00Z');
    const endDate = new Date();

    let totalCalls = 0;
    let savedCalls = 0;
    let createdPhones = 0;
    let case1Count = 0; // outbound-api
    let case2Count = 0; // trunking-terminating
    let case3Count = 0; // trunking-originating
    let page = 0;
    const pageSize = 1000; // Twilio permite hasta 1000 por página

    console.log(`📅 Periodo: ${startDate.toISOString()} - ${endDate.toISOString()}`);

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

    // Almacenar todas las llamadas para procesamiento posterior del caso 3
    const allCalls: TwilioCall[] = [];

    // Obtener llamadas de Twilio con paginación correcta
    console.log('📞 Iniciando obtención de llamadas (esto puede tardar varios minutos)...');
    let hasMore = true;
    let lastCallDate: Date | undefined = endDate;

    while (hasMore) {
      try {
        page++;
        console.log(`\n📄 Página ${page}...`);

        const callsPage: any = await twilioClient.calls.list({
          startTimeAfter: startDate,
          startTimeBefore: lastCallDate,
          pageSize: pageSize,
        });

        if (!callsPage || callsPage.length === 0) {
          console.log('✅ No hay más llamadas');
          break;
        }

        totalCalls += callsPage.length;
        console.log(`  📞 ${callsPage.length} llamadas obtenidas (total acumulado: ${totalCalls})`);

        // Almacenar llamadas para procesamiento
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

        // Actualizar fecha límite para siguiente página (Twilio ordena DESC)
        const lastCall: any = callsPage[callsPage.length - 1];
        if (lastCall && lastCall.startTime) {
          lastCallDate = lastCall.startTime;
        }

        // Si obtuvimos menos del pageSize, no hay más
        if (callsPage.length < pageSize) {
          console.log('✅ Última página alcanzada');
          hasMore = false;
        }

        // Límite de seguridad (100 páginas × 1000 = 100k llamadas)
        if (page >= 100) {
          console.log('⚠️ Alcanzado límite de seguridad (100 páginas)');
          hasMore = false;
        }

        // Pausa para evitar rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`❌ Error en página ${page}:`, error);

        if (error instanceof Error && error.message.includes('429')) {
          console.log('⏳ Rate limit alcanzado, esperando 60 segundos...');
          await new Promise((resolve) => setTimeout(resolve, 60000));
          continue;
        }

        // Otros errores: intentar continuar
        if (page >= 100) break;
      }
    }

    console.log(`\n📊 Total de ${allCalls.length} llamadas obtenidas. Procesando...`);

    // Separar llamadas por tipo
    const case1and2Calls = allCalls.filter(
      (call) => call.direction === 'outbound-api' || call.direction === 'trunking-terminating'
    );
    const case3Calls = allCalls.filter((call) => call.direction === 'trunking-originating');

    console.log(`  📤 Caso 1&2 (outbound-api/trunking-terminating): ${case1and2Calls.length}`);
    console.log(`  📥 Caso 3 (trunking-originating): ${case3Calls.length}`);

    // Procesar casos 1 y 2: el número FROM es del workspace
    const callsToInsert = [];

    for (const call of case1and2Calls) {
      const phoneFrom = call.from;
      let workspaceId = phoneToWorkspace.get(phoneFrom);

      // Si el número no existe en workspace_phones, crearlo con workspace_id = 1
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
          console.error(`  ❌ Error creando número ${phoneFrom}:`, insertPhoneError);
          workspaceId = 1; // Default al workspace 1
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

    // Procesar caso 3: el número FROM es del lead, necesitamos buscar el workspace
    for (const call of case3Calls) {
      const leadPhone = call.from;
      const callEndTime = call.endTime;

      if (!callEndTime) {
        console.log(`  ⚠️ Llamada ${call.sid} sin endTime, usando workspace 1`);
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

      // Buscar CUALQUIER llamada (outbound-api o trunking-terminating) donde TO = leadPhone
      const matchingCalls = case1and2Calls.filter((c) => c.to === leadPhone && c.endTime);

      let workspaceId = 1; // Default

      if (matchingCalls.length > 0) {
        // Encontrar la llamada más cercana al endTime
        const closestCall = matchingCalls.reduce((closest, current) => {
          const closestDiff = Math.abs(closest.endTime!.getTime() - callEndTime.getTime());
          const currentDiff = Math.abs(current.endTime!.getTime() - callEndTime.getTime());
          return currentDiff < closestDiff ? current : closest;
        });

        // Usar el FROM de esa llamada para buscar el workspace
        const workspacePhone = closestCall.from;
        workspaceId = phoneToWorkspace.get(workspacePhone) || 1;

        // Si no existe el número, crearlo
        if (!phoneToWorkspace.has(workspacePhone)) {
          console.log(`  ➕ Creando número de workspace desde caso 3: ${workspacePhone}`);

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
      } else {
        console.log(`  ⚠️ No se encontró llamada relacionada para lead ${leadPhone}`);
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

    // Insertar todas las llamadas en lotes de 500
    console.log(`\n💾 Insertando ${callsToInsert.length} llamadas en base de datos...`);

    const batchSize = 500;
    for (let i = 0; i < callsToInsert.length; i += batchSize) {
      const batch = callsToInsert.slice(i, i + batchSize);

      const { error: insertError, data: inserted } = await supabase
        .from('calls')
        .upsert(batch as any, { onConflict: 'id' })
        .select('id');

      if (insertError) {
        console.error(`  ❌ Error insertando lote ${Math.floor(i / batchSize) + 1}:`, insertError);
      } else {
        savedCalls += inserted?.length || 0;
        console.log(
          `  ✅ Lote ${Math.floor(i / batchSize) + 1}: ${inserted?.length || 0} llamadas`
        );
      }

      // Pausa breve entre lotes
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    console.log('\n🎉 Resincronización completada!');
    console.log(`📊 Total llamadas obtenidas: ${totalCalls}`);
    console.log(`  📤 Caso 1 (outbound-api): ${case1Count}`);
    console.log(`  📤 Caso 2 (trunking-terminating): ${case2Count}`);
    console.log(`  📥 Caso 3 (trunking-originating): ${case3Count}`);
    console.log(`💾 Total llamadas guardadas: ${savedCalls}`);
    console.log(`📱 Números de workspace creados: ${createdPhones}`);

    return NextResponse.json({
      success: true,
      totalCalls,
      savedCalls,
      createdPhones,
      case1Count,
      case2Count,
      case3Count,
      message: 'Resincronización histórica completada',
    });
  } catch (error) {
    console.error('Error en resincronización:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
