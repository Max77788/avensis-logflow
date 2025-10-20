export type TicketStatus = 
  | "CREATED" 
  | "VERIFIED_AT_SCALE" 
  | "IN_TRANSIT" 
  | "DELIVERED";

export interface Ticket {
  ticket_id: string;
  truck_qr_id: string;
  truck_id: string;
  product: string;
  origin_site: string;
  destination_site: string;
  gross_weight?: number;
  tare_weight?: number;
  net_weight?: number;
  scale_operator_signature?: string;
  destination_signature?: string;
  status: TicketStatus;
  created_at: string;
  verified_at_scale?: string;
  delivered_at?: string;
  load_gps?: string;
  delivery_gps?: string;
  pdf_url?: string;
  customer_email?: string;
  scale_ticket_file_url?: string;
  include_scale_ticket_in_email?: boolean;
}

export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface AuditLog {
  ticket_id: string;
  action: string;
  actor: string;
  timestamp_utc: string;
  metadata_json?: string;
}
