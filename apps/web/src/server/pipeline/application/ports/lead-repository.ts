import type {
  LeadDraft,
  LeadPatch,
  LeadRecord,
} from "../../domain/lead-record";

export type LeadRepository = {
  insert(values: LeadDraft): Promise<string>;
  findById(id: string): Promise<LeadRecord | undefined>;
  findByRuc(ruc: string): Promise<LeadRecord | undefined>;
  findByRucMany(rucs: string[]): Promise<LeadRecord[]>;
  updateById(id: string, values: LeadPatch): Promise<unknown>;
  updateByRuc(ruc: string, values: LeadPatch): Promise<unknown>;
};
