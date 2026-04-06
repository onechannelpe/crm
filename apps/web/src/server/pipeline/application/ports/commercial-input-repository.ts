export type LeadCommercialInput = {
  leadId: number;
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
  findByLeadId(leadId: number): Promise<LeadCommercialInput | undefined>;
  upsert(values: LeadCommercialInput): Promise<unknown>;
};
