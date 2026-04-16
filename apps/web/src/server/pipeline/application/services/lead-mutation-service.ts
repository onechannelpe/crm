import type { LeadPatch } from "../../domain/lead-record";
import type { LeadRepository } from "../ports/lead-repository";

type LeadMutationInput = {
  leads: LeadRepository;
  leadId: number;
  actorUserId: number;
  now: number;
  patch?: Omit<LeadPatch, "updatedBy" | "updatedAt">;
};

export async function applyLeadMutation(input: LeadMutationInput) {
  await input.leads.updateById(input.leadId, {
    ...input.patch,
    updatedBy: input.actorUserId,
    updatedAt: input.now,
  });
}
