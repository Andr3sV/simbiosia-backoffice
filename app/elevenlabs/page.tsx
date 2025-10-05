'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare,
  DollarSign,
  Clock,
  Zap,
  TrendingUp,
  Timer,
  Calendar,
  Filter,
  BarChart3,
  Building2,
  CreditCard,
  Brain,
  Phone,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

interface ChartDataPoint {
  date: string;
  conversations: number;
  cost: number;
  call_charges: number;
  llm_charges: number;
  duration: number;
}

interface Workspace {
  id: number;
  name: string;
}

interface ElevenLabsStats {
  total_conversations: number;
  total_cost: number;
  call_charges: number;
  llm_charges: number;
  cost_approx: number;
  avg_call_duration: number;
  chart_data: ChartDataPoint[];
}

export default function ElevenLabsPage() {
  const [stats, setStats] = useState<ElevenLabsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [chartType, setChartType] = useState<'conversations' | 'cost' | 'call_charges' | 'llm_charges' | 'duration'>(
    'conversations'
  );

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
      let url = '/api/elevenlabs-stats';
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
      console.error('Error fetching ElevenLabs stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    fetchStats();
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [startDate, endDate, selectedWorkspace]);

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

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#171717' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#b380fd] mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading ElevenLabs statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Conversations',
      value: stats?.total_conversations?.toLocaleString('en-US') || '0',
      description: 'All ElevenLabs conversations (from snapshots)',
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Cost',
      value: `${stats?.total_cost?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} credits`,
      description: 'Total credits consumed (from snapshots)',
      icon: CreditCard,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Call Charges',
      value: `${stats?.call_charges?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} credits`,
      description: 'Credits for call processing',
      icon: Phone,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'LLM Charges',
      value: `${stats?.llm_charges?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} credits`,
      description: 'Credits for LLM processing',
      icon: Brain,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Cost Approx.',
      value: `$${stats?.cost_approx?.toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 6 }) || '0.000000'}`,
      description: 'Approximate USD cost',
      icon: DollarSign,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
    },
    {
      title: 'Avg Call Duration',
      value: `${(stats?.avg_call_duration || 0).toLocaleString('en-US')}s`,
      description: 'Average duration per conversation',
      icon: Timer,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#171717' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">ElevenLabs Analytics</h1>
          <p className="mt-2 text-gray-400">Monitor your ElevenLabs conversations and costs</p>
        </div>

        {/* Date Filter */}
        <Card className="mb-8 border border-transparent" style={{ backgroundColor: '#282929' }}>
          <CardContent>
            <div className="space-y-4 mt-6">
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
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          {statCards.map((stat) => (
            <Card
              key={stat.title}
              className="hover:shadow-lg transition-shadow border border-transparent hover:border-[#b380fd]"
              style={{ backgroundColor: '#282929' }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-400">{stat.title}</CardTitle>
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#171717' }}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart Section */}
        {stats && stats.chart_data && stats.chart_data.length > 0 && (
          <Card className="mb-8 border border-transparent" style={{ backgroundColor: '#282929' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" style={{ color: '#b380fd' }} />
                  <CardTitle className="text-white">Evolution Chart</CardTitle>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setChartType('conversations')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                      chartType === 'conversations'
                        ? 'bg-[#b380fd] text-white shadow-md shadow-[#b380fd]/25'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    }`}
                  >
                    Conversations
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
                    onClick={() => setChartType('call_charges')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                      chartType === 'call_charges'
                        ? 'bg-[#b380fd] text-white shadow-md shadow-[#b380fd]/25'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    }`}
                  >
                    Call Charges
                  </button>
                  <button
                    onClick={() => setChartType('llm_charges')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                      chartType === 'llm_charges'
                        ? 'bg-[#b380fd] text-white shadow-md shadow-[#b380fd]/25'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    }`}
                  >
                    LLM Charges
                  </button>
                  <button
                    onClick={() => setChartType('duration')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                      chartType === 'duration'
                        ? 'bg-[#b380fd] text-white shadow-md shadow-[#b380fd]/25'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    }`}
                  >
                    Duration
                  </button>
                </div>
              </div>
              <CardDescription className="text-gray-400">
                Daily evolution of{' '}
                {chartType === 'conversations'
                  ? 'conversation volume'
                  : chartType === 'cost'
                  ? 'total cost'
                  : chartType === 'call_charges'
                  ? 'call charges'
                  : chartType === 'llm_charges'
                  ? 'LLM charges'
                  : 'call duration'}
              </CardDescription>
            </CardHeader>
            <CardContent>
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
                        if (chartType === 'cost' || chartType === 'call_charges' || chartType === 'llm_charges') {
                          return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        }
                        if (chartType === 'duration') return `${Math.round(value / 60)}m`;
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
                        if (chartType === 'cost') return [`${value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} credits`, 'Cost'];
                        if (chartType === 'call_charges') return [`${value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} credits`, 'Call Charges'];
                        if (chartType === 'llm_charges') return [`${value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} credits`, 'LLM Charges'];
                        if (chartType === 'duration')
                          return [`${Math.round(value / 60)}m ${value % 60}s`, 'Duration'];
                        return [value.toLocaleString('en-US'), 'Conversations'];
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
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="border border-transparent" style={{ backgroundColor: '#282929' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="h-5 w-5" style={{ color: '#b380fd' }} />
              Live Sync Status
            </CardTitle>
            <CardDescription className="text-gray-400">
              Data automatically refreshes every 30 seconds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Source</span>
                <span className="text-sm font-semibold text-white">ElevenLabs API</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Provider</span>
                <span className="text-sm font-semibold text-white">ElevenLabs</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Date Range</span>
                <span className="text-sm font-semibold text-white">
                  {activeFilter === 'all'
                    ? 'All Time'
                    : startDate && endDate
                    ? `${startDate} to ${endDate}`
                    : 'Custom Range'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Workspace</span>
                <span className="text-sm font-semibold text-white">
                  {selectedWorkspace === 'all'
                    ? 'All Workspaces'
                    : `Workspace ${selectedWorkspace}`}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Last Updated</span>
                <span className="text-sm font-semibold text-white">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Data is filtered from snapshots and updates automatically every 30 seconds
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}