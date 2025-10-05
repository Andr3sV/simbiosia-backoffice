'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, DollarSign, Clock, Zap, TrendingUp, Timer, Calendar, Filter, BarChart3, Building2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface ChartDataPoint {
  date: string;
  calls: number;
  cost: number;
  duration: number;
  real_minutes: number;
}

interface Workspace {
  id: number;
  name: string;
}

interface TwilioStats {
  total_calls: number;
  total_price: number;
  total_duration_secs: number;
  total_duration_formatted: string;
  total_real_minutes: number;
  avg_seconds_per_call: number;
  chart_data: ChartDataPoint[];
}

export default function TwilioPage() {
  const [stats, setStats] = useState<TwilioStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('all');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [chartType, setChartType] = useState<'calls' | 'cost' | 'duration' | 'real_minutes'>('calls');

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
      let url = '/api/twilio-stats';
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
      console.error('Error fetching Twilio stats:', error);
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
            <p className="mt-4 text-gray-400">Loading Twilio statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Calls',
      value: stats?.total_calls?.toLocaleString() || '0',
      description: 'All Twilio calls (from snapshots)',
      icon: Phone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Cost',
      value: `$${stats?.total_price?.toFixed(2) || '0.00'}`,
      description: 'Total spent on calls (from snapshots)',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Minutes',
      value: stats?.total_real_minutes?.toLocaleString() || '0',
      description: 'Billable minutes (rounded up)',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Total Seconds',
      value: stats?.total_duration_secs?.toLocaleString() || '0',
      description: 'Total seconds (from snapshots)',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Avg Seconds/Call',
      value: stats?.avg_seconds_per_call?.toLocaleString() || '0',
      description: 'Average duration per call',
      icon: Timer,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100',
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#171717' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Twilio Analytics</h1>
          <p className="mt-2 text-gray-400">Monitor your Twilio voice calls and costs</p>
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
                    <SelectItem value="all" className="text-white focus:bg-gray-700 focus:text-white">
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5 mb-8">
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
                    onClick={() => setChartType('duration')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                      chartType === 'duration'
                        ? 'bg-[#b380fd] text-white shadow-md shadow-[#b380fd]/25'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    }`}
                  >
                    Duration
                  </button>
                  <button
                    onClick={() => setChartType('real_minutes')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all duration-200 ${
                      chartType === 'real_minutes'
                        ? 'bg-[#b380fd] text-white shadow-md shadow-[#b380fd]/25'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
                    }`}
                  >
                    Real Minutes
                  </button>
                </div>
              </div>
              <CardDescription className="text-gray-400">
                Daily evolution of {chartType === 'calls' ? 'call volume' : 
                chartType === 'cost' ? 'costs' : 
                chartType === 'duration' ? 'call duration' : 'billable minutes'}
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
                        if (chartType === 'cost') return `$${value.toFixed(2)}`;
                        if (chartType === 'duration') return `${Math.round(value / 60)}m`;
                        return value.toLocaleString();
                      }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: any, name: string) => {
                        if (chartType === 'cost') return [`$${value.toFixed(4)}`, 'Cost'];
                        if (chartType === 'duration') return [`${Math.round(value / 60)}m ${value % 60}s`, 'Duration'];
                        if (chartType === 'real_minutes') return [`${value} min`, 'Real Minutes'];
                        return [value.toLocaleString(), 'Calls'];
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
                <span className="text-sm font-semibold text-white">Twilio Voice API</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Provider</span>
                <span className="text-sm font-semibold text-white">Twilio</span>
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
                    : `Workspace ${selectedWorkspace}`
                  }
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
