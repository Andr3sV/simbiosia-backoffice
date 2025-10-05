import axios from 'axios';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

export interface ElevenLabsConversation {
  conversation_id: string;
  agent_id: string;
  status: string;
  start_time_unix_secs: number;
  call_duration_secs: number;
  analysis?: {
    call_successful: boolean;
  };
  metadata?: {
    from_number?: string;
    to_number?: string;
  };
  transcript?: string;
}

export interface ElevenLabsConversationDetail {
  agent_id: string;
  conversation_id: string;
  status: string;
  metadata?: {
    start_time_unix_secs?: number;
    call_duration_secs?: number;
    cost?: number;
    charging?: {
      dev_discount?: number;
      is_burst?: boolean;
      llm_usage?: number;
      llm_price?: number;
      llm_charge?: number;
      call_charge?: number;
      free_minutes_consumed?: number;
      free_llm_dollars_consumed?: number;
    };
    phone_call?: {
      phone_number_id?: string;
      agent_number?: string;
      external_number?: string;
      type?: string;
      call_sid?: string;
    };
    batch_call?: {
      batch_call_id?: string;
      batch_call_recipient_id?: string;
    };
  };
  transcript?: any[];
}

export interface ElevenLabsCallData {
  id: string;
  from: string;
  to: string;
  duration: number;
  cost: number;
  status: string;
  date: Date;
}

// Estimación de costo basado en duración (ElevenLabs cobra por minuto de conversación)
// Ajustar según el plan real de ElevenLabs
const COST_PER_MINUTE = 0.1; // $0.10 por minuto (ejemplo, verificar precio real)

export async function getElevenLabsConversations(startDate?: Date): Promise<{
  conversations: ElevenLabsConversation[];
  totalCalls: number;
  totalCost: number;
}> {
  try {
    const response = await axios.get(`${ELEVENLABS_BASE_URL}/convai/conversations`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    let conversations: ElevenLabsConversation[] = response.data.conversations || [];

    // Filtrar por fecha si se proporciona
    if (startDate) {
      const startTimestamp = Math.floor(startDate.getTime() / 1000);
      conversations = conversations.filter((conv) => conv.start_time_unix_secs >= startTimestamp);
    }

    let totalCost = 0;
    conversations.forEach((conv) => {
      const durationMinutes = conv.call_duration_secs / 60;
      const cost = durationMinutes * COST_PER_MINUTE;
      totalCost += cost;
    });

    return {
      conversations,
      totalCalls: conversations.length,
      totalCost: parseFloat(totalCost.toFixed(4)),
    };
  } catch (error) {
    console.error('Error fetching ElevenLabs conversations:', error);
    throw new Error(`Failed to fetch ElevenLabs conversations: ${error}`);
  }
}

export async function getElevenLabsConversationById(
  conversationId: string
): Promise<ElevenLabsConversation> {
  try {
    const response = await axios.get(
      `${ELEVENLABS_BASE_URL}/convai/conversations/${conversationId}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(`Error fetching ElevenLabs conversation ${conversationId}:`, error);
    throw new Error(`Failed to fetch ElevenLabs conversation: ${error}`);
  }
}

export async function getElevenLabsCallsByPhoneNumber(
  phoneNumber: string,
  startDate?: Date
): Promise<{
  calls: ElevenLabsCallData[];
  totalCalls: number;
  totalCost: number;
}> {
  try {
    const { conversations } = await getElevenLabsConversations(startDate);

    // Filtrar conversaciones por número de teléfono
    const filteredConversations = conversations.filter((conv) => {
      return conv.metadata?.from_number === phoneNumber;
    });

    let totalCost = 0;
    const calls: ElevenLabsCallData[] = filteredConversations.map((conv) => {
      const durationMinutes = conv.call_duration_secs / 60;
      const cost = durationMinutes * COST_PER_MINUTE;
      totalCost += cost;

      return {
        id: conv.conversation_id,
        from: conv.metadata?.from_number || 'Unknown',
        to: conv.metadata?.to_number || 'Unknown',
        duration: conv.call_duration_secs,
        cost: parseFloat(cost.toFixed(4)),
        status: conv.status,
        date: new Date(conv.start_time_unix_secs * 1000),
      };
    });

    return {
      calls,
      totalCalls: calls.length,
      totalCost: parseFloat(totalCost.toFixed(4)),
    };
  } catch (error) {
    console.error('Error fetching ElevenLabs calls by phone:', error);
    throw new Error(`Failed to fetch ElevenLabs calls: ${error}`);
  }
}

export async function getAllElevenLabsCallsByPhone(startDate?: Date): Promise<{
  callsByPhone: Map<string, { calls: ElevenLabsCallData[]; totalCost: number }>;
}> {
  try {
    const { conversations } = await getElevenLabsConversations(startDate);
    const callsByPhone = new Map<string, { calls: ElevenLabsCallData[]; totalCost: number }>();

    conversations.forEach((conv) => {
      const phoneNumber = conv.metadata?.from_number || 'Unknown';
      const durationMinutes = conv.call_duration_secs / 60;
      const cost = durationMinutes * COST_PER_MINUTE;

      const callData: ElevenLabsCallData = {
        id: conv.conversation_id,
        from: phoneNumber,
        to: conv.metadata?.to_number || 'Unknown',
        duration: conv.call_duration_secs,
        cost: parseFloat(cost.toFixed(4)),
        status: conv.status,
        date: new Date(conv.start_time_unix_secs * 1000),
      };

      if (!callsByPhone.has(phoneNumber)) {
        callsByPhone.set(phoneNumber, { calls: [], totalCost: 0 });
      }

      const phoneData = callsByPhone.get(phoneNumber)!;
      phoneData.calls.push(callData);
      phoneData.totalCost += cost;
    });

    return { callsByPhone };
  } catch (error) {
    console.error('Error fetching all ElevenLabs calls:', error);
    throw new Error(`Failed to fetch all ElevenLabs calls: ${error}`);
  }
}

/**
 * Obtiene el listado de IDs de conversaciones con paginación
 */
export async function getElevenLabsConversationsList(
  startDate?: Date,
  page_size: number = 100
): Promise<string[]> {
  try {
    const conversationIds: string[] = [];
    let cursor: string | null = null;
    let hasMore = true;

    console.log('📞 Fetching ElevenLabs conversation IDs...');

    while (hasMore) {
      const params: any = {
        page_size,
      };

      if (cursor) {
        params.cursor = cursor;
      }

      const response = await axios.get(`${ELEVENLABS_BASE_URL}/convai/conversations`, {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        params,
      });

      const conversations: ElevenLabsConversation[] = response.data.conversations || [];

      // Filtrar por fecha si se proporciona
      let filteredConversations = conversations;
      if (startDate) {
        const startTimestamp = Math.floor(startDate.getTime() / 1000);
        filteredConversations = conversations.filter(
          (conv) => conv.start_time_unix_secs >= startTimestamp
        );
      }

      filteredConversations.forEach((conv) => {
        conversationIds.push(conv.conversation_id);
      });

      // Verificar si hay más páginas
      cursor = response.data.next_cursor || null;
      hasMore = !!cursor;

      console.log(`  ✅ Fetched ${conversationIds.length} conversation IDs so far...`);
    }

    console.log(`  ✅ Total conversation IDs: ${conversationIds.length}`);
    return conversationIds;
  } catch (error) {
    console.error('Error fetching ElevenLabs conversations list:', error);
    throw new Error(`Failed to fetch ElevenLabs conversations list: ${error}`);
  }
}

/**
 * Obtiene el detalle completo de todas las conversaciones desde una fecha
 */
export async function getAllElevenLabsConversationsDetail(
  startDate?: Date
): Promise<ElevenLabsConversationDetail[]> {
  try {
    console.log('📞 Fetching all ElevenLabs conversation details...');

    // Primero obtener todos los IDs
    const conversationIds = await getElevenLabsConversationsList(startDate);

    console.log(`📊 Fetching details for ${conversationIds.length} conversations...`);
    console.log(
      `⚠️  This will take approximately ${Math.ceil(
        conversationIds.length / 3
      )} seconds due to rate limiting`
    );

    // Obtener detalles de cada conversación con rate limiting
    const conversationDetails: ElevenLabsConversationDetail[] = [];
    const batchSize = 3; // Reducir a 3 por lote para evitar rate limiting
    let errors429 = 0;

    for (let i = 0; i < conversationIds.length; i += batchSize) {
      const batch = conversationIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (conversationId) => {
        let retries = 0;
        const maxRetries = 3;

        while (retries < maxRetries) {
          try {
            const response = await axios.get(
              `${ELEVENLABS_BASE_URL}/convai/conversations/${conversationId}`,
              {
                headers: {
                  'xi-api-key': ELEVENLABS_API_KEY,
                },
                timeout: 10000,
              }
            );
            return response.data as ElevenLabsConversationDetail;
          } catch (error: any) {
            if (error.response?.status === 429) {
              retries++;
              errors429++;
              const waitTime = Math.pow(2, retries) * 1000; // Exponential backoff
              console.log(
                `  ⏳ Rate limited, waiting ${waitTime}ms before retry ${retries}/${maxRetries}...`
              );
              await new Promise((resolve) => setTimeout(resolve, waitTime));
            } else {
              console.error(
                `  ❌ Error fetching conversation ${conversationId}: ${
                  error.response?.status || error.message
                }`
              );
              return null;
            }
          }
        }

        console.error(
          `  ❌ Failed to fetch conversation ${conversationId} after ${maxRetries} retries`
        );
        return null;
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter((r) => r !== null) as ElevenLabsConversationDetail[];
      conversationDetails.push(...validResults);

      if ((i + batchSize) % 100 === 0 || i + batchSize >= conversationIds.length) {
        console.log(
          `  ✅ Processed ${Math.min(i + batchSize, conversationIds.length)}/${
            conversationIds.length
          } conversations (429 errors: ${errors429})`
        );
      }

      // Pausa más larga entre lotes para evitar rate limiting
      if (i + batchSize < conversationIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 segundo entre lotes
      }
    }

    console.log(`  ✅ Total conversations with details: ${conversationDetails.length}`);
    console.log(`  ⚠️  Total 429 errors encountered: ${errors429}`);
    return conversationDetails;
  } catch (error) {
    console.error('Error fetching all ElevenLabs conversation details:', error);
    throw new Error(`Failed to fetch all ElevenLabs conversation details: ${error}`);
  }
}
