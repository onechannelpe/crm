import type { LeadHistoryRepository } from "../ports/history-repository";
import type { LeadRepository } from "../ports/lead-repository";

export type ReviewLeadDeps = {
  leads: LeadRepository;
  leadHistory: LeadHistoryRepository;
};
