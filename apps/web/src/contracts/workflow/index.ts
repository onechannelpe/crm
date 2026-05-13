import type { Role } from "~/lib/auth/access/rbac";

export const LEAD_STAGES = [
  "QUALIFYING",
  "DISQUALIFIED",
  "SCOPING",
  "QUOTING",
  "QUOTED",
  "CLOSING",
  "LIVE",
] as const;

export const PRODUCT_SCOPES = ["none", "shared", "per_venue"] as const;
export const LEAD_STATUSES = [
  "DISPONIBLE",
  "SIN RESULTADO",
  "CARTERIZADO",
  "STOCK",
] as const;
export const LEAD_PRIORITIES = ["P1", "P2", "SIN RESULTADO"] as const;
export const LEAD_CALL_OUTCOMES = [
  "answered",
  "no_answer",
  "wrong_number",
  "callback_requested",
  "qualified",
  "disqualified",
] as const;
export const MONEDAS = ["PEN", "USD"] as const;
export const SALE_BANK_KINDS = ["BCP", "OTRO"] as const;
export const ABONO_BANKS = [
  "BCP",
  "BBVA",
  "SCOTIABANK",
  "INTERBANK",
  "NACION",
  "BANBIF",
  "MI BANCO",
] as const;
export const MODALIDAD_COBRO_KINDS = [
  "SUSCRIPCIONES",
  "ONE_CLIC",
  "CARGO_UNICO",
] as const;
export const ACCOUNT_TYPE_KINDS = ["AHORROS", "CORRIENTE"] as const;

export type ProductScope = (typeof PRODUCT_SCOPES)[number];
export type LeadStage = (typeof LEAD_STAGES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];
export type LeadCallOutcome = (typeof LEAD_CALL_OUTCOMES)[number];
export type Moneda = (typeof MONEDAS)[number];
export type SaleBankKind = (typeof SALE_BANK_KINDS)[number];
export type AbonoBank = (typeof ABONO_BANKS)[number];
export type ModalidadCobro = (typeof MODALIDAD_COBRO_KINDS)[number];
export type AccountTypeKind = (typeof ACCOUNT_TYPE_KINDS)[number];

export type SaleVenueAccount = {
  currency: Moneda;
  banco: AbonoBank;
  tipoCuenta: AccountTypeKind;
  nroCuenta: string;
  cci?: string;
  isSettlement: boolean;
};

export type VenueDigitalConfig = {
  linkUrl?: string | null;
  onlineUrl?: string | null;
  onlineModalidad?: ModalidadCobro | null;
};

export function isMoneda(value: string): value is Moneda {
  return (MONEDAS as readonly string[]).includes(value);
}

export function isAbonoBank(
  value: string | null | undefined,
): value is AbonoBank {
  return (ABONO_BANKS as readonly string[]).includes(value ?? "");
}

export function isLeadStage(value: string): value is LeadStage {
  return (LEAD_STAGES as readonly string[]).includes(value);
}

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

export function isBcpBank(value: string | null | undefined): boolean {
  return (value ?? "").trim().toUpperCase() === "BCP";
}

export function isModalidadCobro(value: string): value is ModalidadCobro {
  return (MODALIDAD_COBRO_KINDS as readonly string[]).includes(value);
}

export function isAccountTypeKind(value: string): value is AccountTypeKind {
  return (ACCOUNT_TYPE_KINDS as readonly string[]).includes(value);
}

export type ActorContext = {
  userId: number;
  role: Role;
  branchId: number;
};

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

export type LeadAvailableAction =
  | "log-call"
  | "add-note"
  | "request-quotation"
  | "review-lead"
  | "create-quotation"
  | "approve-for-sale"
  | "request-rate-negotiation"
  | "reassign-lead";

export type LeadBlockingField =
  | "proveedorActual"
  | "tasaActual"
  | "gpv"
  | "ticket"
  | "giroNegocio"
  | "abonoBank"
  | "posTotal"
  | "venueAccounts";

export type LeadCommandResult = {
  leadId: string;
};

export type LeadInteractionResult = {
  interactionId: string;
};

export type LeadQuotationResult = {
  id: string;
};

export type WorkflowFileStatus = "ready" | "processing" | "failed";

export type LeadSaleProofFileView = {
  id: number;
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
  uploadedAt: number;
  uploadedByUserId: number;
  status: WorkflowFileStatus;
};

export type LeadNegotiationFileView = {
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
};

export type AssignableExecutiveView = {
  id: number;
  fullName: string;
};

export type LeadBootstrapPreviewView = {
  razonSocial: string | null;
  address: string | null;
  engineStatus: "available" | "missing" | "failed";
};

export type LeadListRowView = {
  id: string;
  ruc: string;
  razonSocial: string | null;
  address: string | null;
  executiveId: number;
  executiveName: string;
  createdBy: number;
  createdByName: string;
  stage: LeadStage;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  nextStep: string;
  createdAt: number;
  updatedAt: number;
};

export type LeadListView = {
  rows: LeadListRowView[];
  totalCount: number;
};

export type SunatEconomicActivity = {
  role: "principal" | "secondary";
  order: number | null;
  label: string;
  code: string;
  description: string;
};

export type SunatSourceStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "stale";

export type LeadTimelineItem = {
  id: string;
  occurredAt: number;
  kind: "call" | "note" | "assignment" | "stage-change" | "system";
  title: string;
  description: string;
  actorDisplayName: string;
};

export type LeadDetailLeadView = {
  id: string;
  ruc: string;
  isFavorite: boolean;
  razonSocial: string | null;
  address: string | null;
  district: string | null;
  department: string | null;
  executiveId: number;
  executiveName: string;
  createdBy: number;
  createdByName: string;
  updatedBy: number | null;
  updatedByName: string | null;
  stage: LeadStage;
  status: LeadStatus | null;
  prioridad: LeadPriority | null;
  nextStep: string;
  createdAt: number;
  updatedAt: number;
};

export type LeadDetailProfileView = {
  leadId: string;
  proveedorActual: string | null;
  tasaActual: number | null;
  gpv: number | null;
  ticket: number | null;
  giroNegocio: string | null;
  abonoBank: AbonoBank | null;
  posTotal: number | null;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
  updatedAt: number;
  updatedBy: number;
};

export type LeadDetailRepLegalView = {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  telefono: string | null;
  email: string | null;
};

export type LeadDetailQuotationView = {
  id: string;
  leadId: string;
  version: number;
  moneda: Moneda;
  fee: number;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  createdAt: number;
  createdBy: number;
};

export type LeadDetailVenueView = {
  id: string;
  leadId: string;
  nombreComercial: string;
  posQuantity: number;
  linkUrl: string | null;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
  direccion: string;
  referencia: string;
  distrito: string;
  provincia: string;
  departamento: string;
  solesAccount?: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
  createdAt: number;
  createdBy: number;
};

export type LeadDetailSourceStatusView = {
  sunat: {
    status: SunatSourceStatus;
    fetchedAt: number | null;
    district: string | null;
    department: string | null;
    contributorStatus: string | null;
    contributorCondition: string | null;
    economicActivities: SunatEconomicActivity[];
    payloadAvailable: boolean;
  };
};

export type LeadDetailNegotiationFileView = {
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
};

export type LeadDetailNegotiationRequestView = {
  id: string;
  round: number;
  justification: string;
  requestedBy: number;
  requestedAt: number;
  files: LeadDetailNegotiationFileView[];
};

export type LeadDetailView = {
  lead: LeadDetailLeadView;
  profile: LeadDetailProfileView | undefined;
  repLegal: LeadDetailRepLegalView | undefined;
  quotations: LeadDetailQuotationView[];
  venues: LeadDetailVenueView[];
  negotiationRequests: LeadDetailNegotiationRequestView[];
  timeline: LeadTimelineItem[];
  availableActions: LeadAvailableAction[];
  blockingFields: LeadBlockingField[];
  sourceStatus: LeadDetailSourceStatusView;
};
