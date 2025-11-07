export type TicketStatus = "CREATED" | "VERIFIED" | "DELIVERED" | "CLOSED";

export type UserRole = "driver" | "attendant";

export type DriverStatus = "active" | "inactive";

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
  driver_signature?: string;
  status: TicketStatus;
  created_at: string;
  verified_at_scale?: string;
  delivered_at?: string;
  signed_off_at?: string;
  load_gps?: string;
  delivery_gps?: string;
  driver_gps?: string;
  driver_confirmer_name?: string;
  pdf_url?: string;
  customer_email?: string;
  scale_ticket_file_url?: string;
  include_scale_ticket_in_email?: boolean;
  confirmer_name?: string;
  carrier?: string;
  carrier_id?: string;
  driver_name?: string;
  driver_id?: string;
  ticket_image_url?: string;
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

export interface AuthUser {
  id: string;
  role: UserRole;
  driver_id?: string;
  name?: string;
}

export interface DriverProfile {
  id: string;
  name: string;
  carrier_id: string;
  default_truck_id: string;
  driver_qr_code: string;
  status: DriverStatus;
  created_at: string;
  updated_at: string;
}
