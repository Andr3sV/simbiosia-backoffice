export interface CallData {
  id: string;
  from: string;
  to: string;
  duration: number;
  cost: number;
  status: string;
  date: Date;
  source: 'twilio' | 'elevenlabs';
}

export interface WorkspaceStats {
  workspace_id: number;
  workspace_name: string;
  phone_number: string;
  twilio_calls: number;
  twilio_cost: number;
  elevenlabs_calls: number;
  elevenlabs_cost: number;
  total_calls: number;
  total_cost: number;
  last_updated: Date;
}

export interface SnapshotData {
  id: number;
  workspace_id: number;
  snapshot_date: string;
  twilio_total_calls: number;
  twilio_total_cost: number;
  elevenlabs_total_calls: number;
  elevenlabs_total_cost: number;
  combined_total_calls: number;
  combined_total_cost: number;
}
