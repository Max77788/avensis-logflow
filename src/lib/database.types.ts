export interface Database {
  public: {
    Tables: {
      tickets: {
        Row: {
          ticket_id: string;
          truck_qr_id: string;
          truck_id: string;
          product: string;
          origin_site: string;
          destination_site: string;
          gross_weight: number | null;
          tare_weight: number | null;
          net_weight: number | null;
          scale_operator_signature: string | null;
          destination_signature: string | null;
          status: string;
          created_at: string | null;
          verified_at_scale: string | null;
          delivered_at: string | null;
          load_gps: string | null;
          delivery_gps: string | null;
          pdf_url: string | null;
          customer_email: string | null;
          scale_ticket_file_url: string | null;
          include_scale_ticket_in_email: boolean | null;
        };
        Insert: {
          ticket_id: string;
          truck_qr_id: string;
          truck_id: string;
          product: string;
          origin_site: string;
          destination_site: string;
          gross_weight?: number | null;
          tare_weight?: number | null;
          net_weight?: number | null;
          scale_operator_signature?: string | null;
          destination_signature?: string | null;
          status?: string;
          created_at?: string | null;
          verified_at_scale?: string | null;
          delivered_at?: string | null;
          load_gps?: string | null;
          delivery_gps?: string | null;
          pdf_url?: string | null;
          customer_email?: string | null;
          scale_ticket_file_url?: string | null;
          include_scale_ticket_in_email?: boolean | null;
        };
        Update: {
          ticket_id?: string;
          truck_qr_id?: string;
          truck_id?: string;
          product?: string;
          origin_site?: string;
          destination_site?: string;
          gross_weight?: number | null;
          tare_weight?: number | null;
          net_weight?: number | null;
          scale_operator_signature?: string | null;
          destination_signature?: string | null;
          status?: string;
          created_at?: string | null;
          verified_at_scale?: string | null;
          delivered_at?: string | null;
          load_gps?: string | null;
          delivery_gps?: string | null;
          pdf_url?: string | null;
          customer_email?: string | null;
          scale_ticket_file_url?: string | null;
          include_scale_ticket_in_email?: boolean | null;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          ticket_id: string;
          action: string;
          actor: string;
          timestamp_utc: string | null;
          metadata_json: Record<string, unknown> | null;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          action: string;
          actor: string;
          timestamp_utc?: string | null;
          metadata_json?: Record<string, unknown> | null;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          action?: string;
          actor?: string;
          timestamp_utc?: string | null;
          metadata_json?: Record<string, unknown> | null;
        };
      };
    };
  };
}
