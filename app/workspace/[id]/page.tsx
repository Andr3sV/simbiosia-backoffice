'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Phone, DollarSign, Clock } from 'lucide-react';
import StatCard from '@/components/StatCard';
import CallsTable from '@/components/CallsTable';
import CostChart from '@/components/CostChart';

interface Call {
  id: string;
  source: 'twilio' | 'elevenlabs';
  phone_from: string | null;
  phone_to: string | null;
  duration: number | null;
  cost: number | null;
  status: string | null;
  call_date: string | null;
}

interface Snapshot {
  id: number;
  snapshot_date: string;
  twilio_total_calls: number;
  twilio_total_cost: number;
  elevenlabs_total_calls: number;
  elevenlabs_total_cost: number;
  combined_total_calls: number;
  combined_total_cost: number;
}

export default function WorkspacePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [params.id]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/workspaces/${params.id}/history`);
      const data = await response.json();
      if (data.success) {
        setSnapshots(data.snapshots);
      }
    } catch (error) {
      console.error('Error fetching workspace history:', error);
    } finally {
      setLoading(false);
    }
  };

  const latestSnapshot = snapshots[0];

  // Preparar datos para el gráfico de tendencias
  const chartData = snapshots
    .slice(0, 10)
    .reverse()
    .map((snapshot) => ({
      date: new Date(snapshot.snapshot_date).toLocaleDateString(),
      twilio: snapshot.twilio_total_cost,
      elevenlabs: snapshot.elevenlabs_total_cost,
      total: snapshot.combined_total_cost,
    }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Workspace #{params.id}</h1>
            <p className="text-sm text-muted-foreground mt-1">Detailed call analytics</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : latestSnapshot ? (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard
                title="Total Calls"
                value={latestSnapshot.combined_total_calls}
                icon={Phone}
                subtitle="All platforms"
              />
              <StatCard
                title="Total Cost"
                value={`$${latestSnapshot.combined_total_cost.toFixed(2)}`}
                icon={DollarSign}
                subtitle="Combined spend"
              />
              <StatCard
                title="Last Updated"
                value={new Date(latestSnapshot.snapshot_date).toLocaleDateString()}
                icon={Clock}
                subtitle={new Date(latestSnapshot.snapshot_date).toLocaleTimeString()}
              />
            </div>

            {/* Platform Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-blue-400">Twilio</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Calls</span>
                    <span className="font-semibold text-foreground">
                      {latestSnapshot.twilio_total_calls}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cost</span>
                    <span className="font-semibold text-green-400">
                      ${latestSnapshot.twilio_total_cost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Cost/Call</span>
                    <span className="font-semibold text-foreground">
                      $
                      {latestSnapshot.twilio_total_calls > 0
                        ? (
                            latestSnapshot.twilio_total_cost / latestSnapshot.twilio_total_calls
                          ).toFixed(4)
                        : '0.0000'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-purple-400">ElevenLabs</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Calls</span>
                    <span className="font-semibold text-foreground">
                      {latestSnapshot.elevenlabs_total_calls}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Cost</span>
                    <span className="font-semibold text-green-400">
                      ${latestSnapshot.elevenlabs_total_cost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Cost/Call</span>
                    <span className="font-semibold text-foreground">
                      $
                      {latestSnapshot.elevenlabs_total_calls > 0
                        ? (
                            latestSnapshot.elevenlabs_total_cost /
                            latestSnapshot.elevenlabs_total_calls
                          ).toFixed(4)
                        : '0.0000'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="mb-8">
                <CostChart data={chartData} />
              </div>
            )}

            {/* History Table */}
            <div className="mb-4">
              <h2 className="text-2xl font-bold text-foreground mb-2">Snapshot History</h2>
              <p className="text-sm text-muted-foreground">
                Historical data collected every 12 hours
              </p>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-secondary/50 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Twilio Calls
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Twilio Cost
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        EL Calls
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        EL Cost
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {snapshots.map((snapshot) => (
                      <tr key={snapshot.id} className="hover:bg-secondary/30 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                          {new Date(snapshot.snapshot_date).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                          {snapshot.twilio_total_calls}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-green-400">
                          ${snapshot.twilio_total_cost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                          {snapshot.elevenlabs_total_calls}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-green-400">
                          ${snapshot.elevenlabs_total_cost.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary">
                          ${snapshot.combined_total_cost.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">No data available</p>
            <p className="text-sm text-muted-foreground mt-2">
              Run a sync to fetch data for this workspace
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
