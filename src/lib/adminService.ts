import { supabase } from "./supabase";
import CryptoJS from "crypto-js";

// ============================================================================
// TYPES
// ============================================================================

export type CompanyType =
  | "Carrier"
  | "Scale House"
  | "Destination Client"
  | "Other";
export type CompanyStatus =
  | "Draft"
  | "Onboarding Invited"
  | "Onboarding In Progress"
  | "Active"
  | "Suspended";
export type AgreementStatus = "Not Shown" | "Shown" | "Accepted" | "Declined";
export type DataCompletionStatus = "Not Started" | "In Progress" | "Complete";

export interface Company {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  password_hash?: string;
  contact_info_id_fk?: number;
  // Extended fields (may not exist in actual DB yet)
  company_type?: CompanyType;
  status?: CompanyStatus;
  primary_contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  agreement_status?: AgreementStatus;
  agreement_accepted_at?: string;
  company_details_status?: DataCompletionStatus;
  contacts_status?: DataCompletionStatus;
  fleet_status?: DataCompletionStatus;
  drivers_status?: DataCompletionStatus;
  portal_access_enabled?: boolean;
  portal_activated_at?: string;
}

export interface ContactInfo {
  id: number;
  created_at: string;
  Company_id: string; // Foreign key to companies.id (REQUIRED)
  Contact_Name?: string;
  Contact_Email?: string;
  Contact_Phone?: string;
  Role?: string;
  Notes?: string;
  Location?: string;
}

export interface CompanyContact {
  id: string;
  company_id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PortalUser {
  id: string;
  company_id: string;
  email: string;
  password_hash: string;
  temp_password?: string;
  role: string;
  is_enabled: boolean;
  is_locked: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface OnboardingEmail {
  id: string;
  company_id: string;
  sent_to: string;
  sent_by: string;
  sent_at: string;
  email_status: string;
  template_used?: string;
  metadata?: any;
}

export interface DestinationSite {
  id: string;
  company_id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  default_email?: string;
  gps_location?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PickupSite {
  id: string;
  company_id: string | null;
  name: string;
  gps_location?: string;
  address?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// ADMIN SERVICE
// ============================================================================

export const adminService = {
  // ============================================================================
  // COMPANIES
  // ============================================================================

  async getAllCompanies(tableName: string = "companies"): Promise<Company[]> {
    try {
      // Use the specific foreign key relationship to avoid ambiguity
      // companies.contact_info_id_fk -> Contact_Info.id (many-to-one)
      const { data, error } = await supabase
        .from(tableName)
        .select("*, Contact_Info!companies_contact_info_id_fk_fkey(*)")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error in getAllCompanies:", error);
        throw error;
      }

      console.log("getAllCompanies - fetched data:", data?.length, "companies");
      return (data as any) || [];
    } catch (error) {
      console.error("Error fetching companies:", error);
      return [];
    }
  },

  async getCompanyById(
    id: string,
    tableName: string = "companies"
  ): Promise<Company | null> {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select("*, Contact_Info!companies_contact_info_id_fk_fkey(*)")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data || null;
    } catch (error) {
      console.error("Error fetching company:", error);
      return null;
    }
  },

  async createCompany(
    company: Partial<Company>,
    tableName: string = "companies"
  ): Promise<{ success: boolean; data?: Company; error?: string }> {
    try {
      // Step 0: Check if company name already exists
      if (company.name) {
        const { data: existingCompany } = await supabase
          .from(tableName)
          .select("id, name")
          .ilike("name", company.name)
          .single();

        if (existingCompany) {
          return {
            success: false,
            error: `A company with the name "${company.name}" already exists. Please use a different name.`,
          };
        }
      }

      // Step 1: Create company first (without contact_info_id_fk)
      const companyData: any = {
        name: company.name,
      };

      if (company.password_hash) {
        companyData.password_hash = company.password_hash;
      }

      const { data: newCompany, error: companyError } = await supabase
        .from(tableName)
        .insert(companyData)
        .select()
        .single();

      if (companyError) throw companyError;

      // Step 2: Create Contact_Info if contact details are provided
      // Note: Contact_Info requires Company_id, so we create it after the company
      let contactInfoId: number | undefined;

      if (
        company.primary_contact_name ||
        company.contact_email ||
        company.contact_phone
      ) {
        const contactInfoData: any = {
          Company_id: newCompany.id, // Required field
        };

        if (company.primary_contact_name) {
          contactInfoData.Contact_Name = company.primary_contact_name;
        }
        if (company.contact_email) {
          contactInfoData.Contact_Email = company.contact_email;
        }
        if (company.contact_phone) {
          contactInfoData.Contact_Phone = company.contact_phone;
        }

        const { data: contactData, error: contactError } = await supabase
          .from("Contact_Info")
          .insert(contactInfoData as any)
          .select()
          .single();

        if (contactError) {
          console.error("Error creating contact info:", contactError);
        } else if (contactData) {
          contactInfoId = (contactData as any).id;

          // Step 3: Update company with contact_info_id_fk
          await supabase
            .from(tableName)
            .update({ contact_info_id_fk: contactInfoId } as any)
            .eq("id", newCompany.id);
        }
      }

      // Step 4: Fetch the complete company with Contact_Info joined
      const { data, error } = await supabase
        .from(tableName)
        .select("*, Contact_Info!companies_contact_info_id_fk_fkey(*)")
        .eq("id", newCompany.id)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error("Error creating company:", error);

      // Provide better error message for duplicate company name
      let errorMessage = error.message;
      if (error.message && error.message.includes("carriers_name_key")) {
        errorMessage = `A company with the name "${company.name}" already exists. Please use a different name.`;
      } else if (error.code === "23505") {
        // PostgreSQL unique violation error code
        errorMessage = `A company with the name "${company.name}" already exists. Please use a different name.`;
      }

      return { success: false, error: errorMessage };
    }
  },

  async updateCompany(
    id: string,
    updates: Partial<Company>,
    tableName: string = "companies"
  ): Promise<{ success: boolean; data?: Company; error?: string }> {
    try {
      // Build update object with only valid company table fields
      const companyUpdates: any = {
        updated_at: new Date().toISOString(),
      };

      // Only include fields that exist in the companies table
      if (updates.name !== undefined) companyUpdates.name = updates.name;
      if (updates.password_hash !== undefined)
        companyUpdates.password_hash = updates.password_hash;
      if (updates.contact_info_id_fk !== undefined)
        companyUpdates.contact_info_id_fk = updates.contact_info_id_fk;

      const { data, error } = await supabase
        .from(tableName)
        .update(companyUpdates)
        .eq("id", id)
        .select("*, Contact_Info!companies_contact_info_id_fk_fkey(*)")
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error("Error updating company:", error);
      return { success: false, error: error.message };
    }
  },

  async deleteCompany(
    id: string,
    tableName: string = "companies"
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First get the company to find contact_info_id_fk
      const company = await this.getCompanyById(id, tableName);

      // Delete the company
      const { error } = await supabase.from(tableName).delete().eq("id", id);

      if (error) throw error;

      // Delete associated Contact_Info if it exists
      if (company && company.contact_info_id_fk) {
        await supabase
          .from("Contact_Info")
          .delete()
          .eq("id", company.contact_info_id_fk);
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error deleting company:", error);
      return { success: false, error: error.message };
    }
  },

  // ============================================================================
  // CONTACT INFO
  // ============================================================================

  async createContactInfo(
    contactInfo: Partial<ContactInfo> & { Company_id: string }
  ): Promise<{ success: boolean; data?: ContactInfo; error?: string }> {
    try {
      const contactData: any = {
        Company_id: contactInfo.Company_id, // Required field
      };

      if (contactInfo.Contact_Name) {
        contactData.Contact_Name = contactInfo.Contact_Name;
      }
      if (contactInfo.Contact_Email) {
        contactData.Contact_Email = contactInfo.Contact_Email;
      }
      if (contactInfo.Contact_Phone) {
        contactData.Contact_Phone = contactInfo.Contact_Phone;
      }
      if (contactInfo.Role) {
        contactData.Role = contactInfo.Role;
      }
      if (contactInfo.Notes) {
        contactData.Notes = contactInfo.Notes;
      }
      if (contactInfo.Location) {
        contactData.Location = contactInfo.Location;
      }

      const { data, error } = await supabase
        .from("Contact_Info")
        .insert(contactData as any)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: data as any };
    } catch (error: any) {
      console.error("Error creating contact info:", error);
      return { success: false, error: error.message };
    }
  },

  async getContactInfo(id: number): Promise<ContactInfo | null> {
    try {
      const { data, error } = await supabase
        .from("Contact_Info")
        .select("*")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as any;
    } catch (error) {
      console.error("Error fetching contact info:", error);
      return null;
    }
  },

  async getContactInfoByCompanyId(companyId: string): Promise<ContactInfo[]> {
    try {
      const { data, error } = await supabase
        .from("Contact_Info")
        .select("*")
        .eq("Company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as any) || [];
    } catch (error) {
      console.error("Error fetching contact info by company:", error);
      return [];
    }
  },

  async updateContactInfo(
    id: number,
    updates: Partial<ContactInfo>
  ): Promise<{ success: boolean; data?: ContactInfo; error?: string }> {
    try {
      const updateData: any = {};

      // Only include fields that are provided in updates
      if (updates.Contact_Name !== undefined) {
        updateData.Contact_Name = updates.Contact_Name;
      }
      if (updates.Contact_Email !== undefined) {
        updateData.Contact_Email = updates.Contact_Email;
      }
      if (updates.Contact_Phone !== undefined) {
        updateData.Contact_Phone = updates.Contact_Phone;
      }
      if (updates.Role !== undefined) {
        updateData.Role = updates.Role;
      }
      if (updates.Notes !== undefined) {
        updateData.Notes = updates.Notes;
      }
      if (updates.Location !== undefined) {
        updateData.Location = updates.Location;
      }
      // Note: Company_id should not be updated after creation

      const { data, error } = await supabase
        .from("Contact_Info")
        .update(updateData as any)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: data as any };
    } catch (error: any) {
      console.error("Error updating contact info:", error);
      return { success: false, error: error.message };
    }
  },

  async deleteContactInfo(
    id: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("Contact_Info")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting contact info:", error);
      return { success: false, error: error.message };
    }
  },

  // ============================================================================
  // COMPANY CONTACTS
  // ============================================================================

  async getCompanyContacts(companyId: string): Promise<CompanyContact[]> {
    try {
      const { data, error } = await supabase
        .from("company_contacts")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching company contacts:", error);
      return [];
    }
  },

  async createCompanyContact(
    contact: Partial<CompanyContact>
  ): Promise<{ success: boolean; data?: CompanyContact; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("company_contacts")
        .insert(contact)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error("Error creating company contact:", error);
      return { success: false, error: error.message };
    }
  },

  async updateCompanyContact(
    id: string,
    updates: Partial<CompanyContact>
  ): Promise<{ success: boolean; data?: CompanyContact; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("company_contacts")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error("Error updating company contact:", error);
      return { success: false, error: error.message };
    }
  },

  async deleteCompanyContact(
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("company_contacts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting company contact:", error);
      return { success: false, error: error.message };
    }
  },

  // ============================================================================
  // PORTAL USERS
  // ============================================================================

  async getPortalUsers(companyId: string): Promise<PortalUser[]> {
    try {
      const { data, error } = await supabase
        .from("portal_users")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching portal users:", error);
      return [];
    }
  },

  async createPortalUser(user: {
    company_id: string;
    email: string;
    role?: string;
  }): Promise<{
    success: boolean;
    data?: PortalUser & { temp_password: string };
    error?: string;
  }> {
    try {
      // Generate temporary password
      const tempPassword =
        Math.random().toString(36).slice(-10) +
        Math.random().toString(36).slice(-10).toUpperCase();
      const passwordHash = CryptoJS.SHA256(tempPassword).toString();

      const { data, error } = await supabase
        .from("portal_users")
        .insert({
          company_id: user.company_id,
          email: user.email,
          password_hash: passwordHash,
          temp_password: tempPassword,
          role: user.role || "Company Admin",
          is_enabled: true,
          is_locked: false,
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data: { ...data, temp_password: tempPassword } };
    } catch (error: any) {
      console.error("Error creating portal user:", error);
      return { success: false, error: error.message };
    }
  },

  async updatePortalUser(
    id: string,
    updates: Partial<PortalUser>
  ): Promise<{ success: boolean; data?: PortalUser; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("portal_users")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error("Error updating portal user:", error);
      return { success: false, error: error.message };
    }
  },

  async resetPortalUserPassword(
    id: string
  ): Promise<{ success: boolean; temp_password?: string; error?: string }> {
    try {
      const tempPassword =
        Math.random().toString(36).slice(-10) +
        Math.random().toString(36).slice(-10).toUpperCase();
      const passwordHash = CryptoJS.SHA256(tempPassword).toString();

      const { error } = await supabase
        .from("portal_users")
        .update({
          password_hash: passwordHash,
          temp_password: tempPassword,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      return { success: true, temp_password: tempPassword };
    } catch (error: any) {
      console.error("Error resetting portal user password:", error);
      return { success: false, error: error.message };
    }
  },

  async togglePortalUserLock(
    id: string,
    isLocked: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("portal_users")
        .update({
          is_locked: isLocked,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error toggling portal user lock:", error);
      return { success: false, error: error.message };
    }
  },

  // ============================================================================
  // ONBOARDING EMAILS
  // ============================================================================

  async getOnboardingEmails(companyId: string): Promise<OnboardingEmail[]> {
    try {
      const { data, error } = await supabase
        .from("onboarding_emails")
        .select("*")
        .eq("company_id", companyId)
        .order("sent_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching onboarding emails:", error);
      return [];
    }
  },

  async sendOnboardingEmail(
    params: {
      company_id: string;
      company_name: string;
      sent_to: string;
      sent_by: string;
      username: string;
      temp_password: string;
    },
    tableName: string = "companies"
  ): Promise<{ success: boolean; data?: OnboardingEmail; error?: string }> {
    try {
      // In a real implementation, this would send an actual email
      // For now, we'll just log the email and store the record
      const emailTemplate = `
Dear ${params.company_name},

Welcome to Avensis LogFlow! Your portal account has been created.

Portal Login URL: ${window.location.origin}/login
Username: ${params.username}
Temporary Password: ${params.temp_password}

Please complete your onboarding by visiting: ${window.location.origin}/vendor/onboarding

Best regards,
Avensis LogFlow Team
      `;

      console.log("Onboarding Email:", emailTemplate);

      const { data, error } = await supabase
        .from("onboarding_emails")
        .insert({
          company_id: params.company_id,
          sent_to: params.sent_to,
          sent_by: params.sent_by,
          email_status: "Sent",
          template_used: "onboarding_v1",
          metadata: {
            username: params.username,
            company_name: params.company_name,
          },
        })
        .select()
        .single();

      if (error) throw error;

      // Update company status
      await supabase
        .from(tableName)
        .update({ status: "Onboarding Invited" })
        .eq("id", params.company_id);

      return { success: true, data };
    } catch (error: any) {
      console.error("Error sending onboarding email:", error);
      return { success: false, error: error.message };
    }
  },

  // ============================================================================
  // DESTINATION SITES
  // ============================================================================

  async getAllDestinationSites(): Promise<DestinationSite[]> {
    try {
      const { data, error } = await supabase
        .from("destination_sites")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching destination sites:", error);
      return [];
    }
  },

  async getDestinationSitesByCompany(
    companyId: string
  ): Promise<DestinationSite[]> {
    try {
      const { data, error } = await supabase
        .from("destination_sites")
        .select("*")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching destination sites:", error);
      return [];
    }
  },

  async createDestinationSite(
    site: Partial<DestinationSite>
  ): Promise<{ success: boolean; data?: DestinationSite; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("destination_sites")
        .insert(site)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error("Error creating destination site:", error);
      return { success: false, error: error.message };
    }
  },

  async updateDestinationSite(
    id: string,
    updates: Partial<DestinationSite>
  ): Promise<{ success: boolean; data?: DestinationSite; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("destination_sites")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error("Error updating destination site:", error);
      return { success: false, error: error.message };
    }
  },

  async deleteDestinationSite(
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("destination_sites")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting destination site:", error);
      return { success: false, error: error.message };
    }
  },

  // ============================================================================
  // PICKUP SITES / SCALE HOUSES
  // ============================================================================

  async getAllPickupSites(): Promise<PickupSite[]> {
    try {
      const { data, error } = await supabase
        .from("pickup_sites")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error in getAllPickupSites:", error);
        throw error;
      }
      console.log("getAllPickupSites - fetched data:", data?.length, "sites");
      return data || [];
    } catch (error) {
      console.error("Error fetching pickup sites:", error);
      return [];
    }
  },

  async getPickupSitesByCompany(companyId: string): Promise<PickupSite[]> {
    try {
      const { data, error } = await supabase
        .from("pickup_sites")
        .select("*")
        .eq("company_id", companyId)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error in getPickupSitesByCompany:", error);
        throw error;
      }
      return data || [];
    } catch (error) {
      console.error("Error fetching pickup sites:", error);
      return [];
    }
  },

  async createPickupSite(
    site: Partial<PickupSite>
  ): Promise<{ success: boolean; data?: PickupSite; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("pickup_sites")
        .insert(site)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error("Error creating pickup site:", error);
      return { success: false, error: error.message };
    }
  },

  async updatePickupSite(
    id: string,
    updates: Partial<PickupSite>
  ): Promise<{ success: boolean; data?: PickupSite; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("pickup_sites")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error: any) {
      console.error("Error updating pickup site:", error);
      return { success: false, error: error.message };
    }
  },

  async deletePickupSite(
    id: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from("pickup_sites")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting pickup site:", error);
      return { success: false, error: error.message };
    }
  },

  // ============================================================================
  // STATISTICS & COUNTS
  // ============================================================================

  async getCompanyStats(companyId: string): Promise<{
    trucks_count: number;
    drivers_count: number;
    contacts_count: number;
    destination_sites_count: number;
    pickup_sites_count: number;
  }> {
    try {
      const [trucks, drivers, contacts, destSites, pickupSites] =
        await Promise.all([
          supabase
            .from("trucks")
            .select("id", { count: "exact" })
            .eq("carrier_id", companyId),
          supabase
            .from("drivers")
            .select("id", { count: "exact" })
            .eq("carrier_id", companyId),
          supabase
            .from("company_contacts")
            .select("id", { count: "exact" })
            .eq("company_id", companyId),
          supabase
            .from("destination_sites")
            .select("id", { count: "exact" })
            .eq("company_id", companyId),
          supabase
            .from("pickup_sites")
            .select("id", { count: "exact" })
            .eq("company_id", companyId),
        ]);

      return {
        trucks_count: trucks.count || 0,
        drivers_count: drivers.count || 0,
        contacts_count: contacts.count || 0,
        destination_sites_count: destSites.count || 0,
        pickup_sites_count: pickupSites.count || 0,
      };
    } catch (error) {
      console.error("Error fetching company stats:", error);
      return {
        trucks_count: 0,
        drivers_count: 0,
        contacts_count: 0,
        destination_sites_count: 0,
        pickup_sites_count: 0,
      };
    }
  },
};
