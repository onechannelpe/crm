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
  giroNegocio: string | null;
  tipoProducto: CulqiProductKind | null;
  urlCliente: string | null;
  modalidadCobro: ModalidadCobro;
  repLegalNombres: string | null;
  repLegalApellidoPaterno: string | null;
  repLegalApellidoMaterno: string | null;
  repLegalDni: string | null;
  repLegalTelefono: string | null;
  repLegalEmail: string | null;
  updatedAt: number;
  updatedBy: number;
};

export type LeadCommercialInputRepository = {
  findByLeadId(leadId: string): Promise<LeadCommercialInput | undefined>;
  upsert(values: LeadCommercialInput): Promise<unknown>;
};
