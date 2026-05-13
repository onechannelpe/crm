import type { LeadPatch } from "../../domain/lead-record";

export type LeadWriteRepository = {
  updateLead(input: {
    leadId: string;
    actorUserId: number;
    now: number;
    patch: Omit<LeadPatch, "updatedBy" | "updatedAt">;
  }): Promise<void>;
};

export type CheckedLeadWriteRepository = {
  updateLeadChecked(input: {
    leadId: string;
    actorUserId: number;
    now: number;
    expectedUpdatedAt: number;
    patch: Omit<LeadPatch, "updatedBy" | "updatedAt">;
  }): Promise<boolean>;
};
