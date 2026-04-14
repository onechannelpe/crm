import type {
  LeadDraft,
  LeadPatch,
  LeadRecord,
} from "../../domain/lead-record";

export type LeadRepository = {
  insert(values: LeadDraft): Promise<number>;
  findById(id: number): Promise<LeadRecord | undefined>;
  findByRuc(ruc: string): Promise<LeadRecord | undefined>;
  findByRucMany(rucs: string[]): Promise<LeadRecord[]>;
  updateById(id: number, values: LeadPatch): Promise<unknown>;
  updateByRuc(ruc: string, values: LeadPatch): Promise<unknown>;
};
