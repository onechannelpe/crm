export interface User {
  id: number;
  name: string;
  full_name?: string;
  email?: string;
  role: string;
  is_active?: boolean;
}

export interface LeadAssignment {
  id: number;
  contact_id: number;
  assigned_at: number;
  expires_at: number;
  status: string;
  contact?: Contact;
}

export interface Contact {
  id: number;
  name: string;
  dni?: string;
  phone_primary?: string;
  phone_secondary?: string;
  org_name: string;
  org_ruc: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  subtype?: string;
  price: number;
}

export interface ChargeNoteItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
}

export interface ChargeNote {
  id: number;
  contact_id: number;
  user_id: number;
  status: "Draft" | "Pending_Back" | "Rejected" | "Approved";
  exec_code_real?: string;
  exec_code_tdp?: string;
  created_at: number;
  updated_at: number;
  items?: ChargeNoteItem[];
}

export interface RejectionLog {
  id: number;
  charge_note_id: number;
  field_id: string;
  reviewer_note: string;
  is_resolved: number;
  created_at: number;
}
