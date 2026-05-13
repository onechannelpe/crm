import type { LeadRecord } from "../../domain/lead-record";

export type LeadReadRepository = {
  findById(id: string): Promise<LeadRecord | undefined>;
};
