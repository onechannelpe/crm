import type { AbonoBank } from "~/workflow/contracts/lead-schema";

export type LeadCommercialInput = {
  leadId: string;
  proveedorActual: string | null;
  tasaActual: number | null;
  gpv: number | null;
  ticket: number | null;
  abono: AbonoBank | null;
  cantidadPos: number | null;
  updatedAt: number;
  updatedBy: number;
};

export type LeadCommercialInputRepository = {
  findByLeadId(leadId: string): Promise<LeadCommercialInput | undefined>;
  upsert(values: LeadCommercialInput): Promise<unknown>;
};
