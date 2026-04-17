import type { LeadId, LeadRecord } from "../domain/lead-record";

export type LeadReadRepository = {
  findById(id: LeadId): Promise<LeadRecord | undefined>;
};
