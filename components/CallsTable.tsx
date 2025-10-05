'use client';

import { useState } from 'react';
import { ArrowUpDown } from 'lucide-react';

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

interface CallsTableProps {
  calls: Call[];
}

export default function CallsTable({ calls }: CallsTableProps) {
  const [sortField, setSortField] = useState<keyof Call>('call_date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: keyof Call) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedCalls = [...calls].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];

    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button
                  onClick={() => handleSort('source')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Source <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button
                  onClick={() => handleSort('phone_from')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  From <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button
                  onClick={() => handleSort('phone_to')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  To <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button
                  onClick={() => handleSort('duration')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Duration <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button
                  onClick={() => handleSort('cost')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Cost <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button
                  onClick={() => handleSort('status')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Status <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <button
                  onClick={() => handleSort('call_date')}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  Date <ArrowUpDown className="w-3 h-3" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedCalls.map((call) => (
              <tr key={call.id} className="hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      call.source === 'twilio'
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'bg-purple-500/10 text-purple-400'
                    }`}
                  >
                    {call.source}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                  {call.phone_from || 'N/A'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                  {call.phone_to || 'N/A'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                  {formatDuration(call.duration)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-green-400">
                  ${call.cost?.toFixed(4) || '0.0000'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-foreground">
                  {call.status || 'N/A'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-muted-foreground">
                  {call.call_date ? new Date(call.call_date).toLocaleString() : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedCalls.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No calls found</p>
          </div>
        )}
      </div>
    </div>
  );
}
