import type { LeadId, UserId } from "../../domain/lead-record";

export type LeadCommercialInput = {
  leadId: LeadId;
  proveedorActual: string | null;
  tasaActual: number | null;
  gpv: number | null;
  ticket: number | null;
  abono: number | null;
  cantidadPos: number | null;
  updatedAt: number;
  updatedBy: UserId;
};

export type LeadCommercialInputRepository = {
  findByLeadId(leadId: LeadId): Promise<LeadCommercialInput | undefined>;
  upsert(values: LeadCommercialInput): Promise<unknown>;
};
