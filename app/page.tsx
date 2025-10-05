'use client';

import { useEffect, useState } from 'react';
import { Phone, DollarSign, TrendingUp, RefreshCw, Activity } from 'lucide-react';
import StatCard from '@/components/StatCard';
import WorkspaceCard from '@/components/WorkspaceCard';
import CostChart from '@/components/CostChart';

interface Workspace {
  id: number;
  name: string;
  phone_number: string;
  latest_snapshot?: {
    twilio_total_calls: number;
    twilio_total_cost: number;
    elevenlabs_total_calls: number;
    elevenlabs_total_cost: number;
    combined_total_calls: number;
    combined_total_cost: number;
    snapshot_date: string;
  } | null;
}

export default function Home() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/workspaces');
      const data = await response.json();
      if (data.success) {
        setWorkspaces(data.workspaces);
        prepareChartData(data.workspaces);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);

      // Sincronizar Twilio
      console.log('Starting Twilio sync...');
      const twilioResponse = await fetch('/api/sync-hourly', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev-secret'}`,
        },
      });
      const twilioData = await twilioResponse.json();
      console.log('Twilio sync result:', twilioData);

      // Sincronizar ElevenLabs
      console.log('Starting ElevenLabs sync...');
      const elevenlabsResponse = await fetch('/api/sync-elevenlabs-hourly', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'dev-secret'}`,
        },
      });
      const elevenlabsData = await elevenlabsResponse.json();
      console.log('ElevenLabs sync result:', elevenlabsData);

      if (twilioData.success && elevenlabsData.success) {
        alert('Data synced successfully!');
        fetchWorkspaces();
      } else {
        alert(`Sync completed with issues. Check console for details.`);
      }
    } catch (error) {
      console.error('Error syncing:', error);
      alert('Error syncing data');
    } finally {
      setSyncing(false);
    }
  };

  const prepareChartData = (workspaces: Workspace[]) => {
    // Preparar datos para el gráfico
    // Por ahora, solo mostramos el snapshot más reciente
    // En el futuro, se puede expandir para mostrar histórico
    const data = workspaces
      .filter((w) => w.latest_snapshot)
      .map((w) => ({
        date: new Date(w.latest_snapshot!.snapshot_date).toLocaleDateString(),
        twilio: w.latest_snapshot!.twilio_total_cost,
        elevenlabs: w.latest_snapshot!.elevenlabs_total_cost,
        total: w.latest_snapshot!.combined_total_cost,
      }));
    setChartData(data);
  };

  // Calcular totales globales
  const globalStats = workspaces.reduce(
    (acc, workspace) => {
      if (workspace.latest_snapshot) {
        acc.totalCalls += workspace.latest_snapshot.combined_total_calls;
        acc.totalCost += workspace.latest_snapshot.combined_total_cost;
        acc.twilioCalls += workspace.latest_snapshot.twilio_total_calls;
        acc.elevenlabsCalls += workspace.latest_snapshot.elevenlabs_total_calls;
      }
      return acc;
    },
    { totalCalls: 0, totalCost: 0, twilioCalls: 0, elevenlabsCalls: 0 }
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#171717' }}>
      {/* Header */}
      <header
        className="border-b border-gray-800 backdrop-blur-sm sticky top-0 z-10"
        style={{ backgroundColor: '#171717' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Summary</h1>
            </div>
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: '#b380fd' }}
              onMouseEnter={(e) => !syncing && (e.currentTarget.style.backgroundColor = '#a06eec')}
              onMouseLeave={(e) => !syncing && (e.currentTarget.style.backgroundColor = '#b380fd')}
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : (
          <>
            {/* Global Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Calls"
                value={globalStats.totalCalls}
                icon={Phone}
                subtitle="All workspaces"
              />
              <StatCard
                title="Total Cost"
                value={`$${globalStats.totalCost.toFixed(2)}`}
                icon={DollarSign}
                subtitle="Combined"
              />
              <StatCard
                title="Twilio Calls"
                value={globalStats.twilioCalls}
                icon={Activity}
                subtitle="Voice calls"
              />
              <StatCard
                title="ElevenLabs Calls"
                value={globalStats.elevenlabsCalls}
                icon={TrendingUp}
                subtitle="Conversational AI"
              />
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="mb-8">
                <CostChart data={chartData} />
              </div>
            )}

            {/* Workspaces */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-foreground mb-2">Workspaces</h2>
              <p className="text-sm text-muted-foreground">
                Monitor calls and costs by workspace phone number
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {workspaces.map((workspace) => (
                <WorkspaceCard key={workspace.id} workspace={workspace} />
              ))}
            </div>

            {workspaces.length === 0 && (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">No workspaces found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add workspaces to your Supabase database to get started
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-muted-foreground">
            Simbiosia AI Call Analytics • Data updates every 12 hours
          </p>
        </div>
      </footer>
    </div>
  );
}
