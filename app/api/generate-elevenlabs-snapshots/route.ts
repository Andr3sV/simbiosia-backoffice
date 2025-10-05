import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    // Verificar el secreto para seguridad (opcional para este endpoint)
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('📊 Iniciando generación de snapshots históricos de ElevenLabs...');

    const supabase = getServerSupabase();

    // Obtener el conteo total de conversaciones de ElevenLabs
    console.log('💬 Contando conversaciones de ElevenLabs...');

    const { count, error: countError } = await supabase
      .from('elevenlabs_conversations')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error contando conversaciones:', countError);
      return NextResponse.json({ success: false, error: countError.message }, { status: 500 });
    }

    const totalConversations = count || 0;
    console.log(`📊 Total de conversaciones de ElevenLabs: ${totalConversations}`);

    if (totalConversations === 0) {
      console.log('⚠️  No se encontraron conversaciones de ElevenLabs');
      return NextResponse.json({
        success: true,
        message: 'No conversations found',
        snapshots_created: 0,
      });
    }

    // Obtener todas las conversaciones en lotes
    console.log('💬 Obteniendo conversaciones de ElevenLabs en lotes...');
    let allConversations: any[] = [];
    const pageSize = 1000;
    let offset = 0;

    while (offset < totalConversations) {
      console.log(
        `  📦 Obteniendo lote ${Math.floor(offset / pageSize) + 1}/${Math.ceil(
          totalConversations / pageSize
        )} (${offset} - ${Math.min(offset + pageSize, totalConversations)})...`
      );

      const { data: batch, error: batchError } = await supabase
        .from('elevenlabs_conversations')
        .select(
          'workspace_id, conversation_date, cost, call_duration_secs, llm_price, llm_charge, call_charge, free_minutes_consumed, free_llm_dollars_consumed, dev_discount, llm_usage'
        )
        .order('conversation_date', { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (batchError) {
        console.error(`  ❌ Error obteniendo lote en offset ${offset}:`, batchError);
        break;
      }

      if (batch && batch.length > 0) {
        allConversations = allConversations.concat(batch);
      }

      offset += pageSize;
    }

    const conversations = allConversations;
    console.log(
      `✅ Obtenidas ${conversations.length} conversaciones de ElevenLabs (de ${totalConversations} esperadas)`
    );

    // Agrupar conversaciones por workspace y hora
    console.log('🔄 Agrupando conversaciones por workspace y hora...');

    const snapshotMap = new Map<
      string,
      {
        workspace_id: number | null;
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

    for (const conversation of conversations) {
      // Truncar conversation_date a la hora (eliminar minutos, segundos)
      const conversationDate = new Date(conversation.conversation_date);
      conversationDate.setMinutes(0, 0, 0); // Poner minutos, segundos y ms a 0
      const hourKey = conversationDate.toISOString();

      // Crear clave única: workspace_id + hora
      const workspaceId = conversation.workspace_id || 'null';
      const key = `${workspaceId}_${hourKey}`;

      if (!snapshotMap.has(key)) {
        snapshotMap.set(key, {
          workspace_id: conversation.workspace_id,
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
      snapshot.total_cost += conversation.cost || 0;
      snapshot.total_duration += conversation.call_duration_secs || 0;
      snapshot.llm_price += conversation.llm_price || 0;
      snapshot.llm_charge += conversation.llm_charge || 0;
      snapshot.call_charge += conversation.call_charge || 0;
      snapshot.free_minutes_consumed += conversation.free_minutes_consumed || 0;
      snapshot.free_llm_dollars_consumed += conversation.free_llm_dollars_consumed || 0;
      snapshot.dev_discount += conversation.dev_discount || 0;
    }

    console.log(`✅ Generados ${snapshotMap.size} snapshots únicos`);

    // Convertir Map a array
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

    console.log(`📝 Insertando ${snapshots.length} snapshots en la base de datos...`);

    // Insertar snapshots en lotes de 1000
    const batchSize = 1000;
    let inserted = 0;

    for (let i = 0; i < snapshots.length; i += batchSize) {
      const batch = snapshots.slice(i, i + batchSize);

      console.log(
        `  📦 Procesando lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          snapshots.length / batchSize
        )} (${batch.length} snapshots)...`
      );

      const { error: insertError } = await supabase
        .from('elevenlabs_snapshots')
        .upsert(batch as any, {
          onConflict: 'workspace_id,snapshot_date',
        });

      if (insertError) {
        console.error(`❌ Error insertando lote:`, insertError);
        return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
      }

      inserted += batch.length;
      console.log(`  ✅ Procesados ${inserted}/${snapshots.length} snapshots`);
    }

    console.log('\n📊 Resumen de snapshots creados por workspace:');

    // Agrupar por workspace para mostrar resumen
    const workspaceSummary = new Map<
      number | string,
      { count: number; conversations: number; cost: number }
    >();

    for (const snapshot of snapshots) {
      const workspaceKey = snapshot.workspace_id ?? 'null';
      if (!workspaceSummary.has(workspaceKey)) {
        workspaceSummary.set(workspaceKey, { count: 0, conversations: 0, cost: 0 });
      }
      const summary = workspaceSummary.get(workspaceKey)!;
      summary.count++;
      summary.conversations += snapshot.total_conversations;
      summary.cost += snapshot.total_cost;
    }

    const summaryArray = Array.from(workspaceSummary.entries())
      .map(([workspaceId, data]) => ({
        workspace_id: workspaceId === 'null' ? null : workspaceId,
        snapshots: data.count,
        total_conversations: data.conversations,
        total_cost: parseFloat(data.cost.toFixed(4)),
      }))
      .sort((a, b) => b.snapshots - a.snapshots)
      .slice(0, 10);

    console.table(summaryArray);

    const response = {
      success: true,
      total_conversations_processed: conversations.length,
      snapshots_created: snapshots.length,
      unique_workspaces: workspaceSummary.size,
      top_workspaces: summaryArray,
      date_range: {
        first_conversation: conversations[0]?.conversation_date,
        last_conversation: conversations[conversations.length - 1]?.conversation_date,
      },
    };

    console.log('✅ Generación de snapshots completada exitosamente!');

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ Error generando snapshots:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// También permitir GET para testing manual
export async function GET(request: NextRequest) {
  return POST(request);
}
