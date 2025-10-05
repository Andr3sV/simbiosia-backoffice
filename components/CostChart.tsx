'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CostChartProps {
  data: {
    date: string;
    twilio: number;
    elevenlabs: number;
    total: number;
  }[];
}

export default function CostChart({ data }: CostChartProps) {
  return (
    <div
      className="rounded-lg p-6 border border-transparent"
      style={{ backgroundColor: '#282929' }}
    >
      <h3 className="text-lg font-semibold mb-4 text-white">Cost Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="date" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
          <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#171717',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#ffffff',
            }}
          />
          <Legend />
          <Line type="monotone" dataKey="twilio" stroke="#b380fd" strokeWidth={2} name="Twilio" />
          <Line
            type="monotone"
            dataKey="elevenlabs"
            stroke="#d8b4fe"
            strokeWidth={2}
            name="ElevenLabs"
          />
          <Line type="monotone" dataKey="total" stroke="#10b981" strokeWidth={2} name="Total" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
