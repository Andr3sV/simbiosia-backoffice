#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing Supabase environment variables');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runAnalysis() {
  try {
    console.log('🔍 Analyzing ElevenLabs conversations by workspace...\n');

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, '..', 'supabase', 'analyze_elevenlabs_by_workspace.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Dividir en queries individuales (separados por ;)
    const queries = sqlContent
      .split(';')
      .map(q => q.trim())
      .filter(q => q.length > 0 && !q.startsWith('--'));

    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      
      // Saltar comentarios
      if (query.startsWith('--')) continue;
      
      console.log(`\n📊 Query ${i + 1}:`);
      console.log('─'.repeat(50));
      
      try {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: query });
        
        if (error) {
          console.error(`❌ Error in query ${i + 1}:`, error.message);
          continue;
        }

        if (data && data.length > 0) {
          console.table(data);
        } else {
          console.log('✅ Query executed successfully (no data returned)');
        }
      } catch (err) {
        console.error(`❌ Error executing query ${i + 1}:`, err.message);
      }
    }

    console.log('\n✅ Analysis completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Función alternativa si no existe exec_sql
async function runAnalysisDirect() {
  try {
    console.log('🔍 Analyzing ElevenLabs conversations by workspace...\n');

    // 1. Distribución por workspace
    console.log('📊 1. Distribución de conversaciones por workspace:');
    console.log('─'.repeat(60));
    
    const { data: workspaceStats, error: wsError } = await supabase
      .from('elevenlabs_conversations')
      .select('workspace_id, status, call_duration_secs, cost, call_charge, llm_charge, conversation_date');

    if (wsError) {
      console.error('❌ Error fetching workspace stats:', wsError.message);
      return;
    }

    // Procesar datos manualmente
    const workspaceMap = new Map();
    
    workspaceStats.forEach(conv => {
      const workspaceId = conv.workspace_id || 'NULL';
      
      if (!workspaceMap.has(workspaceId)) {
        workspaceMap.set(workspaceId, {
          workspace_id: workspaceId,
          total_conversations: 0,
          completed_conversations: 0,
          failed_conversations: 0,
          in_progress_conversations: 0,
          total_duration: 0,
          total_cost: 0,
          total_call_charge: 0,
          total_llm_charge: 0,
          first_conversation: null,
          last_conversation: null
        });
      }
      
      const stats = workspaceMap.get(workspaceId);
      stats.total_conversations++;
      
      if (conv.status === 'completed') stats.completed_conversations++;
      else if (conv.status === 'failed') stats.failed_conversations++;
      else if (conv.status === 'in_progress') stats.in_progress_conversations++;
      
      stats.total_duration += conv.call_duration_secs || 0;
      stats.total_cost += conv.cost || 0;
      stats.total_call_charge += conv.call_charge || 0;
      stats.total_llm_charge += conv.llm_charge || 0;
      
      const convDate = new Date(conv.conversation_date);
      if (!stats.first_conversation || convDate < new Date(stats.first_conversation)) {
        stats.first_conversation = conv.conversation_date;
      }
      if (!stats.last_conversation || convDate > new Date(stats.last_conversation)) {
        stats.last_conversation = conv.conversation_date;
      }
    });

    // Convertir a array y ordenar
    const workspaceArray = Array.from(workspaceMap.values())
      .map(ws => ({
        ...ws,
        avg_duration_seconds: ws.total_conversations > 0 ? Math.round((ws.total_duration / ws.total_conversations) * 100) / 100 : 0,
        total_cost: Math.round(ws.total_cost * 10000) / 10000,
        total_call_charge: Math.round(ws.total_call_charge * 10000) / 10000,
        total_llm_charge: Math.round(ws.total_llm_charge * 10000) / 10000
      }))
      .sort((a, b) => b.total_conversations - a.total_conversations);

    console.table(workspaceArray);

    // 2. Resumen general
    console.log('\n📊 2. Resumen general:');
    console.log('─'.repeat(40));
    
    const totalConversations = workspaceStats.length;
    const withWorkspace = workspaceStats.filter(c => c.workspace_id !== null).length;
    const withoutWorkspace = totalConversations - withWorkspace;
    const totalCost = workspaceStats.reduce((sum, c) => sum + (c.cost || 0), 0);
    const avgDuration = workspaceStats.reduce((sum, c) => sum + (c.call_duration_secs || 0), 0) / totalConversations;

    console.table([
      { metric: 'Total Conversations', value: totalConversations },
      { metric: 'With Workspace', value: withWorkspace },
      { metric: 'Without Workspace', value: withoutWorkspace },
      { metric: 'Total Cost', value: Math.round(totalCost * 10000) / 10000 },
      { metric: 'Average Duration (seconds)', value: Math.round(avgDuration * 100) / 100 }
    ]);

    console.log('\n✅ Analysis completed!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar análisis
runAnalysisDirect();
