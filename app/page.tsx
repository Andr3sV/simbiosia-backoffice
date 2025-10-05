'use client';

import { useEffect, useState } from 'react';
import { Phone, DollarSign, Clock, RefreshCw, Calendar, Building2, BarChart3 } from 'lucide-react';
import StatCard from '@/components/StatCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface CombinedStats {
  total_calls: number;
  total_costs: number;
  total_minutes: number;
  twilio_cost: number;
  elevenlabs_cost_usd: number;
  elevenlabs_credits: number;
  chart_data: Array<{
    date: string;
    calls: number;
    cost: number;
    minutes: number;
  }>;
}

interface Workspace {
  id: number;
  name: string;
}

export default function Home() {
  const [stats, setStats] = useState<CombinedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [chartType, setChartType] = useState<'calls' | 'cost' | 'minutes'>('calls');

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [startDate, endDate, selectedWorkspace]);

  const fetchWorkspaces = async () => {
    try {
      const response = await fetch('/api/workspaces-list');
      const data = await response.json();
      if (data.success) {
        setWorkspaces(data.data);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      let url = '/api/combined-stats';
      const params = new URLSearchParams();

      if (startDate && endDate) {
        params.append('startDate', startDate);
        params.append('endDate', endDate);
      }

      if (selectedWorkspace && selectedWorkspace !== 'all') {
        params.append('workspaceId', selectedWorkspace);
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching combined stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const setDateRange = (range: string) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    setActiveFilter(range);

    switch (range) {
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        setStartDate(weekAgo.toISOString().split('T')[0]);
        setEndDate(today);
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        setStartDate(monthAgo.toISOString().split('T')[0]);
        setEndDate(today);
        break;
      case '90days':
        const days90Ago = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        setStartDate(days90Ago.toISOString().split('T')[0]);
        setEndDate(today);
        break;
      case 'year':
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        setStartDate(yearAgo.toISOString().split('T')[0]);
        setEndDate(today);
        break;
      case 'all':
      default:
        setStartDate('');
        setEndDate('');
        break;
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
        fetchStats();
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#171717' }}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b380fd]"></div>
            <p className="ml-4 text-gray-400">Loading combined statistics...</p>
          </div>
        ) : (
          <>
            {/* Date Filter */}
            <div
              className="rounded-lg p-6 border border-transparent mb-8"
              style={{ backgroundColor: '#282929' }}
            >
              <div className="space-y-4">
                {/* Quick Filter Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setDateRange('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeFilter === 'all'
                        ? 'bg-[#b380fd] text-white shadow-lg shadow-[#b380fd]/25'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    }`}
                  >
                    All Time
                  </button>
                  <button
                    onClick={() => setDateRange('week')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeFilter === 'week'
                        ? 'bg-[#b380fd] text-white shadow-lg shadow-[#b380fd]/25'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    }`}
                  >
                    Last 7 Days
                  </button>
                  <button
                    onClick={() => setDateRange('month')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeFilter === 'month'
                        ? 'bg-[#b380fd] text-white shadow-lg shadow-[#b380fd]/25'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    }`}
                  >
                    Last 30 Days
                  </button>
                  <button
                    onClick={() => setDateRange('90days')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeFilter === '90days'
                        ? 'bg-[#b380fd] text-white shadow-lg shadow-[#b380fd]/25'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    }`}
                  >
                    Last 90 Days
                  </button>
                  <button
                    onClick={() => setDateRange('year')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      activeFilter === 'year'
                        ? 'bg-[#b380fd] text-white shadow-lg shadow-[#b380fd]/25'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    }`}
                  >
                    Last Year
                  </button>
                </div>

                {/* Custom Date Range */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">Custom Range:</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          setActiveFilter('custom');
                        }}
                        className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-[#b380fd] focus:ring-1 focus:ring-[#b380fd] transition-colors"
                      />
                    </div>
                    <span className="text-gray-400 text-sm font-medium">to</span>
                    <div className="relative">
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          setActiveFilter('custom');
                        }}
                        className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-[#b380fd] focus:ring-1 focus:ring-[#b380fd] transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* Workspace Filter */}
                <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">Workspace:</span>
                  </div>
                  <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                    <SelectTrigger className="w-[200px] bg-gray-800 border-gray-600 text-white focus:border-[#b380fd] focus:ring-[#b380fd]">
                      <SelectValue placeholder="Select workspace" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      <SelectItem
                        value="all"
                        className="text-white focus:bg-gray-700 focus:text-white"
                      >
                        All Workspaces
                      </SelectItem>
                      {workspaces.map((workspace) => (
                        <SelectItem
                          key={workspace.id}
                          value={workspace.id.toString()}
                          className="text-white focus:bg-gray-700 focus:text-white"
                        >
                          {workspace.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Combined Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <StatCard
                title="Total Calls"
                value={stats?.total_calls?.toLocaleString('en-US') || '0'}
                icon={Phone}
                subtitle="Twilio calls only"
              />
              <StatCard
                title="Total Costs"
                value={`$${
                  stats?.total_costs?.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }) || '0.00'
                }`}
                icon={DollarSign}
                subtitle="Twilio + ElevenLabs"
              />
              <StatCard
                title="Total Minutes"
                value={stats?.total_minutes?.toLocaleString('en-US') || '0'}
                icon={Clock}
                subtitle="Billable minutes"
              />
            </div>

            {/* Chart Section */}
            {stats && stats.chart_data && stats.chart_data.length > 0 && (
              <div
                className="rounded-lg p-6 border border-transparent mb-8"
                style={{ backgroundColor: '#282929' }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" style={{ color: '#b380fd' }} />
                    <h3 className="text-lg font-semibold text-white">Evolution Chart</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setChartType('calls')}
                      className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                        chartType === 'calls'
                          ? 'bg-[#b380fd] text-white shadow-md shadow-[#b380fd]/25'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      }`}
                    >
                      Calls
                    </button>
                    <button
                      onClick={() => setChartType('cost')}
                      className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                        chartType === 'cost'
                          ? 'bg-[#b380fd] text-white shadow-md shadow-[#b380fd]/25'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      }`}
                    >
                      Cost
                    </button>
                    <button
                      onClick={() => setChartType('minutes')}
                      className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                        chartType === 'minutes'
                          ? 'bg-[#b380fd] text-white shadow-md shadow-[#b380fd]/25'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                      }`}
                    >
                      Minutes
                    </button>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  Daily evolution of{' '}
                  {chartType === 'calls'
                    ? 'call volume'
                    : chartType === 'cost'
                    ? 'combined costs'
                    : 'billable minutes'}
                </p>
                <div style={{ width: '100%', height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.chart_data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis
                        dataKey="date"
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <YAxis
                        stroke="#9CA3AF"
                        fontSize={12}
                        tickFormatter={(value) => {
                          if (chartType === 'cost') return `$${value.toFixed(2)}`;
                          if (chartType === 'minutes') return `${value} min`;
                          return value.toLocaleString('en-US');
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#F9FAFB',
                        }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        formatter={(value: any, name: string) => {
                          if (chartType === 'cost')
                            return [
                              `$${value.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`,
                              'Cost',
                            ];
                          if (chartType === 'minutes')
                            return [`${value.toLocaleString('en-US')} min`, 'Minutes'];
                          return [value.toLocaleString('en-US'), 'Calls'];
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey={chartType}
                        stroke="#b380fd"
                        strokeWidth={2}
                        dot={{ fill: '#b380fd', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#b380fd', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
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
