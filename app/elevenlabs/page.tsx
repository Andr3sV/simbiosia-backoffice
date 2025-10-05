'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, DollarSign, Clock, Zap, Brain, Phone } from 'lucide-react';

interface ElevenLabsStats {
  total_conversations: number;
  conversations_with_workspace: number;
  total_cost: number;
  total_call_charge: number;
  total_llm_charge: number;
}

export default function ElevenLabsPage() {
  const [stats, setStats] = useState<ElevenLabsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/elevenlabs-stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching ElevenLabs stats:', error);
      } finally {
        setLoading(false);
      }
    };

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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading ElevenLabs statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Conversations',
      value: stats?.total_conversations?.toLocaleString() || '0',
      icon: MessageSquare,
      description: 'All conversations synced',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'With Workspace',
      value: stats?.conversations_with_workspace?.toLocaleString() || '0',
      icon: Phone,
      description: 'Conversations linked to workspaces',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Cost',
      value: `$${stats?.total_cost?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      description: 'Total spend on conversations',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Call Charges',
      value: `$${stats?.total_call_charge?.toFixed(2) || '0.00'}`,
      icon: Phone,
      description: 'Call-specific charges',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'LLM Charges',
      value: `$${stats?.total_llm_charge?.toFixed(2) || '0.00'}`,
      icon: Brain,
      description: 'AI model usage charges',
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
          <p className="mt-2 text-gray-400">Monitor your ElevenLabs AI conversations and costs</p>
        </div>

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
                <span className="text-sm text-gray-400">Sync Coverage</span>
                <span className="text-sm font-semibold text-white">
                  {stats?.conversations_with_workspace && stats?.total_conversations
                    ? `${(
                        (stats.conversations_with_workspace / stats.total_conversations) *
                        100
                      ).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    background: 'linear-gradient(to right, #b380fd, #d8b4fe)',
                    width:
                      stats?.conversations_with_workspace && stats?.total_conversations
                        ? `${
                            (stats.conversations_with_workspace / stats.total_conversations) * 100
                          }%`
                        : '0%',
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {stats?.total_conversations && stats.conversations_with_workspace
                  ? `${
                      stats.total_conversations - stats.conversations_with_workspace
                    } conversations without workspace assignment`
                  : 'No data available'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
