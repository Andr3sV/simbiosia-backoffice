'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, DollarSign, Clock, Zap, TrendingUp } from 'lucide-react';

interface TwilioStats {
  total_calls: number;
  total_price: number;
  total_duration_secs: number;
  total_duration_formatted: string;
}

export default function TwilioPage() {
  const [stats, setStats] = useState<TwilioStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/twilio-stats');
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
    fetchStats();
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

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
      description: 'All Twilio calls',
      icon: Phone,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Cost',
      value: `$${stats?.total_price?.toFixed(2) || '0.00'}`,
      description: 'Total spent on calls',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Duration',
      value: stats?.total_duration_formatted || '0h 0m 0s',
      description: 'Cumulative call time',
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Duration (seconds)',
      value: stats?.total_duration_secs?.toLocaleString() || '0',
      description: 'Total seconds',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
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

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
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
                <span className="text-sm text-gray-400">Last Updated</span>
                <span className="text-sm font-semibold text-white">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                All call data is synced from your Twilio account and stored in Supabase
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
