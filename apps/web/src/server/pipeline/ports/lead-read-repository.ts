import type { LeadRecord } from "../domain/lead-record";

export type LeadReadRepository = {
  findById(id: number): Promise<LeadRecord | undefined>;
};
