import { supabase } from "./supabase";
import CryptoJS from "crypto-js";
import { sendEmail, generateOnboardingEmailHTML } from "./emailService";

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
  type?: CompanyType;
  status?: CompanyStatus;
  primary_contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  business_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  legal_name_for_invoicing?: string;
  mailing_address?: string;
  mc_number?: string;
  dot_number?: string;
  coi_file_url?: string;
  w9_file_url?: string;
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
  company_id: string; // Foreign key to companies.id (REQUIRED)
  Contact_Name?: string;
  Contact_Email?: string;
  Contact_Phone?: string;
  Role?: string;
  Notes?: string;
  Location?: string;
  is_primary?: boolean;
}

export interface CompanyContact {
  id: string;
  company_id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  location?: string;
  notes?: string;
  is_primary?: boolean;
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
      // Fetch companies
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("Error in getAllCompanies:", error);
        throw error;
      }

      console.log("getAllCompanies - fetched data:", data?.length, "companies");

      // Fetch contact info for each company and populate contact_email field
      if (data && data.length > 0) {
        const companiesWithContacts = await Promise.all(
          data.map(async (company: any) => {
            try {
              const contacts = await this.getContactInfoByCompanyId(company.id);
              if (contacts && contacts.length > 0) {
                // Find primary contact, or use first contact if no primary is set
                const primaryContact =
                  contacts.find((c) => c.is_primary) || contacts[0];
                return {
                  ...company,
                  contact_email: primaryContact.Contact_Email,
                  primary_contact_name: primaryContact.Contact_Name,
                  contact_phone: primaryContact.Contact_Phone,
                };
              }
              return company;
            } catch (err) {
              console.error(
                `Error fetching contacts for company ${company.id}:`,
                err
              );
              return company;
            }
          })
        );
        return companiesWithContacts;
      }

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
        .select("*")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      // Fetch contact info and populate contact fields
      if (data) {
        try {
          const contacts = await this.getContactInfoByCompanyId(data.id);
          if (contacts && contacts.length > 0) {
            // Find primary contact, or use first contact if no primary is set
            const primaryContact =
              contacts.find((c) => c.is_primary) || contacts[0];
            return {
              ...data,
              contact_email: primaryContact.Contact_Email,
              primary_contact_name: primaryContact.Contact_Name,
              contact_phone: primaryContact.Contact_Phone,
            };
          }
        } catch (err) {
          console.error(`Error fetching contacts for company ${data.id}:`, err);
        }
      }

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
      // Note: Contact_Info requires company_id, so we create it after the company
      let contactInfoId: number | undefined;

      if (
        company.primary_contact_name ||
        company.contact_email ||
        company.contact_phone
      ) {
        const contactInfoData: any = {
          company_id: newCompany.id, // Required field
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

      // Step 4: Fetch the complete company
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
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

      // Basic company fields
      if (updates.name !== undefined) companyUpdates.name = updates.name;
      if (updates.password_hash !== undefined)
        companyUpdates.password_hash = updates.password_hash;
      if (updates.contact_info_id_fk !== undefined)
        companyUpdates.contact_info_id_fk = updates.contact_info_id_fk;

      // Company type and status
      if (updates.type !== undefined) companyUpdates.type = updates.type;
      if (updates.status !== undefined) companyUpdates.status = updates.status;

      // Contact information
      if (updates.primary_contact_name !== undefined)
        companyUpdates.primary_contact_name = updates.primary_contact_name;
      if (updates.contact_email !== undefined)
        companyUpdates.contact_email = updates.contact_email;
      if (updates.contact_phone !== undefined)
        companyUpdates.contact_phone = updates.contact_phone;

      // Address fields
      if (updates.city !== undefined) companyUpdates.city = updates.city;
      if (updates.state !== undefined) companyUpdates.state = updates.state;
      if (updates.zip !== undefined) companyUpdates.zip = updates.zip;

      // Vendor onboarding fields
      if ((updates as any).business_address !== undefined)
        companyUpdates.business_address = (updates as any).business_address;
      if ((updates as any).legal_name_for_invoicing !== undefined)
        companyUpdates.legal_name_for_invoicing = (
          updates as any
        ).legal_name_for_invoicing;
      if ((updates as any).mailing_address !== undefined)
        companyUpdates.mailing_address = (updates as any).mailing_address;
      if ((updates as any).mc_number !== undefined)
        companyUpdates.mc_number = (updates as any).mc_number;
      if ((updates as any).dot_number !== undefined)
        companyUpdates.dot_number = (updates as any).dot_number;
      if ((updates as any).coi_file_url !== undefined)
        companyUpdates.coi_file_url = (updates as any).coi_file_url;
      if ((updates as any).w9_file_url !== undefined)
        companyUpdates.w9_file_url = (updates as any).w9_file_url;

      // Onboarding status fields
      if (updates.agreement_status !== undefined)
        companyUpdates.agreement_status = updates.agreement_status;
      if (updates.agreement_accepted_at !== undefined)
        companyUpdates.agreement_accepted_at = updates.agreement_accepted_at;
      if (updates.company_details_status !== undefined)
        companyUpdates.company_details_status = updates.company_details_status;
      if (updates.contacts_status !== undefined)
        companyUpdates.contacts_status = updates.contacts_status;
      if (updates.fleet_status !== undefined)
        companyUpdates.fleet_status = updates.fleet_status;
      if (updates.drivers_status !== undefined)
        companyUpdates.drivers_status = updates.drivers_status;

      // Portal access fields
      if (updates.portal_access_enabled !== undefined)
        companyUpdates.portal_access_enabled = updates.portal_access_enabled;
      if (updates.portal_activated_at !== undefined)
        companyUpdates.portal_activated_at = updates.portal_activated_at;

      const { data, error } = await supabase
        .from(tableName)
        .update(companyUpdates)
        .eq("id", id)
        .select("*")
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
    contactInfo: Partial<ContactInfo> & { company_id: string }
  ): Promise<{ success: boolean; data?: ContactInfo; error?: string }> {
    try {
      const contactData: any = {
        company_id: contactInfo.company_id, // Required field
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
        .eq("company_id", companyId)
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
        .from("Contact_Info")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Map Contact_Info columns to CompanyContact interface
      const mappedData = (data || []).map((contact: any) => ({
        id: contact.id,
        company_id: contact.company_id,
        name: contact.Contact_Name,
        email: contact.Contact_Email,
        phone: contact.Contact_Phone,
        role: contact.Role,
        location: contact.Location,
        notes: contact.Notes,
        is_primary: contact.is_primary,
        created_at: contact.created_at,
        updated_at: contact.updated_at,
      }));

      return mappedData;
    } catch (error) {
      console.error("Error fetching company contacts:", error);
      return [];
    }
  },

  async createCompanyContact(
    contact: Partial<CompanyContact>
  ): Promise<{ success: boolean; data?: CompanyContact; error?: string }> {
    try {
      // Map CompanyContact interface to Contact_Info table columns
      const contactData: any = {
        company_id: contact.company_id,
        Contact_Name: contact.name,
        Contact_Email: contact.email,
        Contact_Phone: contact.phone,
        Role: contact.role,
        Location: contact.location,
        Notes: contact.notes,
        is_primary: contact.is_primary || false,
      };

      const { data, error } = await supabase
        .from("Contact_Info")
        .insert(contactData)
        .select()
        .single();

      if (error) throw error;

      // Map back to CompanyContact interface
      const mappedData: CompanyContact = {
        id: data.id,
        company_id: data.company_id,
        name: data.Contact_Name,
        email: data.Contact_Email,
        phone: data.Contact_Phone,
        role: data.Role,
        location: data.Location,
        notes: data.Notes,
        is_primary: data.is_primary,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      return { success: true, data: mappedData };
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
      // Map CompanyContact interface to Contact_Info table columns
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      if (updates.name !== undefined) updateData.Contact_Name = updates.name;
      if (updates.email !== undefined) updateData.Contact_Email = updates.email;
      if (updates.phone !== undefined) updateData.Contact_Phone = updates.phone;
      if (updates.role !== undefined) updateData.Role = updates.role;
      if ((updates as any).location !== undefined)
        updateData.Location = (updates as any).location;
      if (updates.notes !== undefined) updateData.Notes = updates.notes;
      if (updates.is_primary !== undefined)
        updateData.is_primary = updates.is_primary;

      const { data, error } = await supabase
        .from("Contact_Info")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Map back to CompanyContact interface
      const mappedData: CompanyContact = {
        id: data.id,
        company_id: data.company_id,
        name: data.Contact_Name,
        email: data.Contact_Email,
        phone: data.Contact_Phone,
        role: data.Role,
        location: data.Location,
        notes: data.Notes,
        is_primary: data.is_primary,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      return { success: true, data: mappedData };
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
        .from("Contact_Info")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error deleting company contact:", error);
      return { success: false, error: error.message };
    }
  },

  async setContactAsPrimary(
    contactId: string,
    companyId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // First, unset all other contacts as primary for this company
      const { error: unsetError } = await supabase
        .from("Contact_Info")
        .update({ is_primary: false })
        .eq("company_id", companyId);

      if (unsetError) throw unsetError;

      // Then set this contact as primary
      const { error: setPrimaryError } = await supabase
        .from("Contact_Info")
        .update({ is_primary: true })
        .eq("id", contactId);

      if (setPrimaryError) throw setPrimaryError;

      return { success: true };
    } catch (error: any) {
      console.error("Error setting contact as primary:", error);
      return { success: false, error: error.message };
    }
  },

  // ============================================================================
  // PORTAL ACCESS (Company-level)
  // ============================================================================

  async enablePortalAccess(
    companyId: string,
    enabled: boolean
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: any = {
        portal_access_enabled: enabled,
        updated_at: new Date().toISOString(),
      };

      // Set portal_activated_at timestamp when enabling for the first time
      if (enabled) {
        updateData.portal_activated_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("companies")
        .update(updateData)
        .eq("id", companyId);

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("Error updating portal access:", error);
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
      const loginUrl = `${window.location.origin}/vendor/login`;
      const onboardingUrl = `${window.location.origin}/vendor/onboarding`;

      // Generate HTML email template
      const emailHTML = generateOnboardingEmailHTML({
        companyName: params.company_name,
        username: params.username,
        tempPassword: params.temp_password,
        loginUrl,
        onboardingUrl,
      });

      // Send the actual email
      const emailResult = await sendEmail({
        to: params.sent_to,
        subject: `Welcome to Avensis LogFlow - Your Account is Ready`,
        html: emailHTML,
      });

      // Determine email status based on send result
      const emailStatus = emailResult.success ? "Sent" : "Failed";

      // Store the email record in database
      const { data, error } = await supabase
        .from("onboarding_emails")
        .insert({
          company_id: params.company_id,
          sent_to: params.sent_to,
          sent_by: params.sent_by,
          email_status: emailStatus,
          template_used: "onboarding_v1",
          metadata: {
            username: params.username,
            company_name: params.company_name,
            message_id: emailResult.messageId,
            error: emailResult.error,
          },
        })
        .select()
        .single();

      if (error) throw error;

      // Only update company status if email was sent successfully
      if (emailResult.success) {
        await supabase
          .from(tableName)
          .update({ status: "Onboarding Invited" })
          .eq("id", params.company_id);
      }

      // Return error if email failed to send
      if (!emailResult.success) {
        return {
          success: false,
          error: emailResult.error || "Failed to send email",
          data,
        };
      }

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
            .from("Contact_Info")
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
