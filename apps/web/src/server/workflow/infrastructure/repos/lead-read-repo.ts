import type { LeadRepository } from "../../application/ports/lead-repository";
import type { LeadReadRepository } from "../../ports/lead-read-repository";

export function createLeadReadRepository(
  leads: LeadRepository,
): LeadReadRepository {
  return {
    findById(id) {
      return leads.findById(id);
    },
  };
}
