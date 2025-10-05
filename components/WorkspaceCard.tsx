import { Phone, DollarSign, Activity } from 'lucide-react';

interface WorkspaceCardProps {
  workspace: {
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
  };
  onClick?: () => void;
}

export default function WorkspaceCard({ workspace, onClick }: WorkspaceCardProps) {
  const snapshot = workspace.latest_snapshot;

  return (
    <div
      onClick={onClick}
      className="rounded-lg p-6 hover:shadow-lg transition-all duration-200 cursor-pointer border border-transparent hover:border-[#b380fd]"
      style={{ backgroundColor: '#282929' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">{workspace.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Phone className="w-4 h-4 text-gray-400" />
            <p className="text-sm text-gray-400">{workspace.phone_number}</p>
          </div>
        </div>
        <div className="p-2 rounded-lg" style={{ backgroundColor: '#171717' }}>
          <Activity className="w-5 h-5" style={{ color: '#b380fd' }} />
        </div>
      </div>

      {snapshot ? (
        <div className="space-y-4">
          {/* Total combinado */}
          <div
            className="rounded-lg p-4 border border-gray-800"
            style={{ backgroundColor: '#171717' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Calls</p>
                <p className="text-2xl font-bold" style={{ color: '#b380fd' }}>
                  {snapshot.combined_total_calls}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Total Cost</p>
                <p className="text-2xl font-bold" style={{ color: '#b380fd' }}>
                  ${snapshot.combined_total_cost.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Desglose */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3" style={{ backgroundColor: '#171717' }}>
              <p className="text-xs text-gray-400 mb-1">Twilio</p>
              <p className="text-lg font-semibold text-white">
                {snapshot.twilio_total_calls} calls
              </p>
              <p className="text-sm text-green-400">${snapshot.twilio_total_cost.toFixed(2)}</p>
            </div>
            <div className="rounded-lg p-3" style={{ backgroundColor: '#171717' }}>
              <p className="text-xs text-gray-400 mb-1">ElevenLabs</p>
              <p className="text-lg font-semibold text-white">
                {snapshot.elevenlabs_total_calls} calls
              </p>
              <p className="text-sm text-green-400">${snapshot.elevenlabs_total_cost.toFixed(2)}</p>
            </div>
          </div>

          <p className="text-xs text-gray-500 text-right">
            Updated: {new Date(snapshot.snapshot_date).toLocaleString()}
          </p>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-gray-400">No data available</p>
          <p className="text-xs text-gray-500 mt-1">Run sync to fetch data</p>
        </div>
      )}
    </div>
  );
}
