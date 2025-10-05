export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: number;
          name: string;
          phone_number: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          name: string;
          phone_number: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          name?: string;
          phone_number?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_phones: {
        Row: {
          id: number;
          workspace_id: number;
          phone_number: string;
          is_primary: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          workspace_id: number;
          phone_number: string;
          is_primary?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          workspace_id?: number;
          phone_number?: string;
          is_primary?: boolean;
          created_at?: string;
        };
      };
      call_snapshots: {
        Row: {
          id: number;
          workspace_id: number;
          snapshot_date: string;
          twilio_total_calls: number;
          twilio_total_cost: number;
          twilio_raw_data: Json | null;
          elevenlabs_total_calls: number;
          elevenlabs_total_cost: number;
          elevenlabs_raw_data: Json | null;
          combined_total_calls: number;
          combined_total_cost: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          workspace_id: number;
          snapshot_date?: string;
          twilio_total_calls?: number;
          twilio_total_cost?: number;
          twilio_raw_data?: Json | null;
          elevenlabs_total_calls?: number;
          elevenlabs_total_cost?: number;
          elevenlabs_raw_data?: Json | null;
          combined_total_calls?: number;
          combined_total_cost?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          workspace_id?: number;
          snapshot_date?: string;
          twilio_total_calls?: number;
          twilio_total_cost?: number;
          twilio_raw_data?: Json | null;
          elevenlabs_total_calls?: number;
          elevenlabs_total_cost?: number;
          elevenlabs_raw_data?: Json | null;
          combined_total_calls?: number;
          combined_total_cost?: number;
          created_at?: string;
        };
      };
      calls: {
        Row: {
          id: string;
          workspace_id: number;
          source: 'twilio' | 'elevenlabs';
          phone_from: string | null;
          phone_to: string | null;
          duration: number | null;
          cost: number | null;
          status: string | null;
          call_date: string | null;
          raw_data: Json | null;
          created_at: string;
        };
        Insert: {
          id: string;
          workspace_id: number;
          source: 'twilio' | 'elevenlabs';
          phone_from?: string | null;
          phone_to?: string | null;
          duration?: number | null;
          cost?: number | null;
          status?: string | null;
          call_date?: string | null;
          raw_data?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: number;
          source?: 'twilio' | 'elevenlabs';
          phone_from?: string | null;
          phone_to?: string | null;
          duration?: number | null;
          cost?: number | null;
          status?: string | null;
          call_date?: string | null;
          raw_data?: Json | null;
          created_at?: string;
        };
      };
    };
  };
}
