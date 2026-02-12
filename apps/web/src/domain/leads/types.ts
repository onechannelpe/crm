export interface Contact {
  id: number;
  organizationId: number;
  dni: string;
  name: string;
  phonePrimary: string | null;
  phoneSecondary: string | null;
  lastContactedAt: number | null;
  lastContactedByUserId: number | null;
  cooldownUntil: number | null;
}

export interface LeadAssignment {
  id: number;
  userId: number;
  contactId: number;
  assignedAt: number;
  expiresAt: number;
  status: "Active" | "Completed";
}

export interface Organization {
  id: number;
  ruc: string;
  name: string;
  lockedBranchId: number | null;
  lockedAt: number | null;
  lockedByUserId: number | null;
}
