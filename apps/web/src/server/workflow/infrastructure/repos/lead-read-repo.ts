import type { LeadReadRepository } from "../../application/ports/lead-read-repository";
import type { LeadRepository } from "../../application/ports/lead-repository";

export function createLeadReadRepository(
  leads: LeadRepository,
): LeadReadRepository {
  return {
    findById(id) {
      return leads.findById(id);
    },
  };
}
