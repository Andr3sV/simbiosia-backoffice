import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

const client = twilio(accountSid, authToken);

export interface TwilioCallData {
  sid: string;
  from: string;
  to: string;
  duration: string;
  startTime: string;
  endTime: string;
  price: string;
  priceUnit: string;
  status: string;
  direction: string;
  workspaceNumber?: string; // El número real del workspace
}

// Extraer el workspace number según el tipo de llamada
function getWorkspaceNumber(call: any): string | null {
  const direction = call.direction;
  
  if (direction === 'outbound-api' || direction === 'trunking-terminating') {
    // Caso 1 y 2: El from es el workspace number
    return call.from;
  } else if (direction === 'trunking-originating') {
    // Caso 3: El to contiene el workspace number en el SIP URI
    // Formato: sip:+34911679868@public-vip.ie1.twilio.com
    const sipMatch = call.to.match(/sip:\+?(\d+)@/);
    if (sipMatch) {
      return `+${sipMatch[1]}`;
    }
  }
  
  return null;
}

export async function getTwilioCallsByPhoneNumber(
  phoneNumber: string,
  startDate?: Date
): Promise<{
  calls: TwilioCallData[];
  totalCalls: number;
  totalCost: number;
}> {
  try {
    // Obtener llamadas donde el número es el "from" (llamadas salientes desde ese número)
    const options: any = {
      from: phoneNumber,
      limit: 1000, // Ajustar según necesidad
    };

    // Si se proporciona una fecha de inicio, filtrar desde esa fecha
    if (startDate) {
      options.startTimeAfter = startDate;
    }

    const calls = await client.calls.list(options);

    let totalCost = 0;
    const callsData: TwilioCallData[] = calls.map((call) => {
      const cost = call.price ? Math.abs(parseFloat(call.price)) : 0;
      totalCost += cost;

      return {
        sid: call.sid,
        from: call.from,
        to: call.to,
        duration: call.duration || '0',
        startTime: call.startTime?.toISOString() || '',
        endTime: call.endTime?.toISOString() || '',
        price: call.price || '0',
        priceUnit: call.priceUnit || 'USD',
        status: call.status,
        direction: call.direction,
        workspaceNumber: getWorkspaceNumber(call) || undefined,
      };
    });

    return {
      calls: callsData,
      totalCalls: callsData.length,
      totalCost: parseFloat(totalCost.toFixed(4)),
    };
  } catch (error) {
    console.error('Error fetching Twilio calls:', error);
    throw new Error(`Failed to fetch Twilio calls: ${error}`);
  }
}

export async function getAllTwilioCalls(startDate?: Date): Promise<{
  callsByPhone: Map<string, { calls: TwilioCallData[]; totalCost: number }>;
}> {
  try {
    const callsByPhone = new Map<string, { calls: TwilioCallData[]; totalCost: number }>();

    const options: any = {
      limit: 1000, // Máximo por página
      pageSize: 1000,
    };

    if (startDate) {
      options.startTimeAfter = startDate;
    }

    console.log('  🔄 Fetching Twilio calls with pagination...');
    let totalCalls = 0;
    let page = 0;

    // Obtener TODAS las llamadas usando paginación
    let calls = await client.calls.list(options);

    while (calls.length > 0) {
      page++;
      console.log(`    Page ${page}: ${calls.length} calls`);
      totalCalls += calls.length;

      calls.forEach((call) => {
        // Determinar el workspace number según el tipo de llamada
        const workspaceNumber = getWorkspaceNumber(call);
        
        if (!workspaceNumber) {
          // Si no podemos determinar el workspace, saltar esta llamada
          return;
        }

        const cost = call.price ? Math.abs(parseFloat(call.price)) : 0;

        const callData: TwilioCallData = {
          sid: call.sid,
          from: call.from,
          to: call.to,
          duration: call.duration || '0',
          startTime: call.startTime?.toISOString() || '',
          endTime: call.endTime?.toISOString() || '',
          price: call.price || '0',
          priceUnit: call.priceUnit || 'USD',
          status: call.status,
          direction: call.direction,
          workspaceNumber,
        };

        if (!callsByPhone.has(workspaceNumber)) {
          callsByPhone.set(workspaceNumber, { calls: [], totalCost: 0 });
        }

        const phoneData = callsByPhone.get(workspaceNumber)!;
        phoneData.calls.push(callData);
        phoneData.totalCost += cost;
      });

      // Verificar si hay más páginas
      if (calls.length < 1000) {
        break;
      }

      // Obtener siguiente página
      const lastCall = calls[calls.length - 1];
      if (lastCall.startTime) {
        options.startTimeBefore = lastCall.startTime;
        calls = await client.calls.list(options);
      } else {
        break;
      }
    }

    console.log(`  ✅ Total Twilio calls fetched: ${totalCalls}`);
    console.log(`  📊 Unique workspace numbers detected: ${callsByPhone.size}`);
    return { callsByPhone };
  } catch (error) {
    console.error('Error fetching all Twilio calls:', error);
    throw new Error(`Failed to fetch all Twilio calls: ${error}`);
  }
}