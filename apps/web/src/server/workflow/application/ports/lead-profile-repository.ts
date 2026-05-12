import type {
  AbonoBank,
  ModalidadCobro,
  ProductScope,
} from "~/workflow/contracts/lead-schema";

export type LeadProfile = {
  leadId: string;
  proveedorActual: string | null;
  tasaActual: number | null;
  gpv: number | null;
  ticket: number | null;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
  abonoBank: AbonoBank | null;
  posTotal: number | null;
  updatedAt: number;
  updatedBy: number;
};

export type LeadProfileRepository = {
  findByLeadId(leadId: string): Promise<LeadProfile | undefined>;
  upsert(values: LeadProfile): Promise<void>;
};
