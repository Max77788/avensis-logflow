import { supabase } from './supabase';
import type { Ticket, AuditLog } from './types';

export const ticketService = {
  async createTicket(ticket: Ticket): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('tickets').insert({
        ticket_id: ticket.ticket_id,
        truck_qr_id: ticket.truck_qr_id,
        truck_id: ticket.truck_id,
        product: ticket.product,
        origin_site: ticket.origin_site,
        destination_site: ticket.destination_site,
        gross_weight: ticket.gross_weight || null,
        tare_weight: ticket.tare_weight || null,
        net_weight: ticket.net_weight || null,
        scale_operator_signature: ticket.scale_operator_signature || null,
        destination_signature: ticket.destination_signature || null,
        status: ticket.status,
        created_at: ticket.created_at,
        verified_at_scale: ticket.verified_at_scale || null,
        delivered_at: ticket.delivered_at || null,
        load_gps: ticket.load_gps || null,
        delivery_gps: ticket.delivery_gps || null,
        pdf_url: ticket.pdf_url || null,
        customer_email: ticket.customer_email || null,
        scale_ticket_file_url: ticket.scale_ticket_file_url || null,
        include_scale_ticket_in_email: ticket.include_scale_ticket_in_email || false,
      });

      if (error) throw error;

      await this.logAction(ticket.ticket_id, 'CREATED', 'System', {
        truck_id: ticket.truck_id,
        product: ticket.product,
      });

      return { success: true };
    } catch (error) {
      console.error('Error creating ticket:', error);
      return { success: false, error: String(error) };
    }
  },

  async getTicket(ticketId: string): Promise<Ticket | null> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('ticket_id', ticketId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return this.mapDbTicketToTicket(data);
    } catch (error) {
      console.error('Error getting ticket:', error);
      return null;
    }
  },

  async getAllTickets(): Promise<Ticket[]> {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapDbTicketToTicket);
    } catch (error) {
      console.error('Error getting all tickets:', error);
      return [];
    }
  },

  async updateTicket(
    ticketId: string,
    updates: Partial<Ticket>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: Record<string, unknown> = {};

      if (updates.status !== undefined) updateData.status = updates.status;
      if (updates.destination_signature !== undefined)
        updateData.destination_signature = updates.destination_signature;
      if (updates.delivered_at !== undefined) updateData.delivered_at = updates.delivered_at;
      if (updates.delivery_gps !== undefined) updateData.delivery_gps = updates.delivery_gps;
      if (updates.pdf_url !== undefined) updateData.pdf_url = updates.pdf_url;

      const { error } = await supabase
        .from('tickets')
        .update(updateData)
        .eq('ticket_id', ticketId);

      if (error) throw error;

      if (updates.status) {
        await this.logAction(ticketId, `STATUS_CHANGED_TO_${updates.status}`, 'System', {
          new_status: updates.status,
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating ticket:', error);
      return { success: false, error: String(error) };
    }
  },

  async logAction(
    ticketId: string,
    action: string,
    actor: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    try {
      await supabase.from('audit_logs').insert({
        ticket_id: ticketId,
        action,
        actor,
        metadata_json: metadata || null,
      });
    } catch (error) {
      console.error('Error logging action:', error);
    }
  },

  async getAuditLogs(ticketId: string): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('timestamp_utc', { ascending: false });

      if (error) throw error;

      return (data || []).map((log) => ({
        ticket_id: log.ticket_id,
        action: log.action,
        actor: log.actor,
        timestamp_utc: log.timestamp_utc || new Date().toISOString(),
        metadata_json: log.metadata_json ? JSON.stringify(log.metadata_json) : undefined,
      }));
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  },

  mapDbTicketToTicket(dbTicket: any): Ticket {
    return {
      ticket_id: dbTicket.ticket_id,
      truck_qr_id: dbTicket.truck_qr_id,
      truck_id: dbTicket.truck_id,
      product: dbTicket.product,
      origin_site: dbTicket.origin_site,
      destination_site: dbTicket.destination_site,
      gross_weight: dbTicket.gross_weight,
      tare_weight: dbTicket.tare_weight,
      net_weight: dbTicket.net_weight,
      scale_operator_signature: dbTicket.scale_operator_signature,
      destination_signature: dbTicket.destination_signature,
      status: dbTicket.status,
      created_at: dbTicket.created_at,
      verified_at_scale: dbTicket.verified_at_scale,
      delivered_at: dbTicket.delivered_at,
      load_gps: dbTicket.load_gps,
      delivery_gps: dbTicket.delivery_gps,
      pdf_url: dbTicket.pdf_url,
      customer_email: dbTicket.customer_email,
      scale_ticket_file_url: dbTicket.scale_ticket_file_url,
      include_scale_ticket_in_email: dbTicket.include_scale_ticket_in_email,
    };
  },
};
