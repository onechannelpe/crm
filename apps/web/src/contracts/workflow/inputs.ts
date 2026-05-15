import type { ModalidadCobro, ProductScope } from "./vocabulary";

export type LeadListFiltersInput = {
  stage?: string;
  status?: string;
  prioridad?: string;
  executiveId?: number;
  updatedSinceMs?: number;
  updatedUntilMs?: number;
  sortBy?: "createdAt" | "updatedAt" | "registeredBy" | "ruc";
  sortDirection?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export type LeadIdInput = {
  leadId: string;
};

export type LeadArtifactInput = {
  leadId: string;
  artifactId: string;
};

export type AssignableExecutivesInput = {
  leadId: string;
  search?: string;
  limit?: number;
};

export type CreateLeadInput = {
  ruc: string;
  executiveId?: number;
};

export type SaveDigitalPolicyInput = {
  leadId: string;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
};

export type RequestQuotationInput = SaveCommercialScopeInput;
export type SaveCommercialScopeInput = {
  leadId: string;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  giroNegocio: string;
  abonoBank: string;
  posTotal: number;
};
