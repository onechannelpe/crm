import type {
  CulqiProductKind,
  ModalidadCobro,
} from "~/workflow/contracts/lead-schema";

export type LeadCommercialInput = {
  leadId: string;
  proveedorActual: string | null;
  tasaActual: number | null;
  gpv: number | null;
  ticket: number | null;
  tipoProducto: CulqiProductKind | null;
  urlCliente: string | null;
  modalidadCobro: ModalidadCobro;
  updatedAt: number;
  updatedBy: number;
};

export type LeadCommercialInputRepository = {
  findByLeadId(leadId: string): Promise<LeadCommercialInput | undefined>;
  upsert(values: LeadCommercialInput): Promise<unknown>;
};
