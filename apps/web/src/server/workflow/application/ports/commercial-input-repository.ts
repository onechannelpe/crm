export type LeadCommercialInput = {
  leadId: string;
  proveedorActual: string | null;
  tasaActual: number | null;
  gpv: number | null;
  ticket: number | null;
  abono: number | null;
  cantidadPos: number | null;
  updatedAt: number;
  updatedBy: number;
};

export type LeadCommercialInputRepository = {
  findByLeadId(leadId: string): Promise<LeadCommercialInput | undefined>;
  upsert(values: LeadCommercialInput): Promise<unknown>;
};
