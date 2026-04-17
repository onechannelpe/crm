import type {
  LeadDraft,
  LeadId,
  LeadPatch,
  LeadRecord,
} from "../../domain/lead-record";

export type LeadRepository = {
  insert(values: LeadDraft): Promise<LeadId>;
  findById(id: LeadId): Promise<LeadRecord | undefined>;
  findByRuc(ruc: string): Promise<LeadRecord | undefined>;
  findByRucMany(rucs: string[]): Promise<LeadRecord[]>;
  updateById(id: LeadId, values: LeadPatch): Promise<unknown>;
  updateByRuc(ruc: string, values: LeadPatch): Promise<unknown>;
};
