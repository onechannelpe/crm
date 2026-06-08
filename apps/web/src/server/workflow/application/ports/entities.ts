import type { SunatEconomicActivity } from "~/server/client-search/enrichment/sunat/contracts";
import type { DomainError } from "~/server/shared/domain-error";
import type { OrganizationId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";
import type {
  AbonoBank,
  ModalidadCobro,
  ProductScope,
  SaleVenueAccount,
  Moneda,
} from "~/server/workflow/types";

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

export type LeadQuotation = {
  id: string;
  leadId: string;
  paybackPricing: number;
  tarifaDebito: number;
  tarifaCredito: number;
  tarifaForaneo: number;
  fee: number;
  moneda: Moneda;
  version: number;
  createdAt: number;
  createdBy: number;
};

export type LeadQuotationRepository = {
  insert(values: Omit<LeadQuotation, "id">): Promise<string>;
  listByLeadId(leadId: string): Promise<LeadQuotation[]>;
  nextVersion(leadId: string): Promise<number>;
};

export type LeadVenue = {
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

export type LeadVenueInsert = Omit<
  LeadVenue,
  "id" | "solesAccount" | "dollarAccount"
>;

export type LeadVenueUpdate = Omit<
  LeadVenue,
  "id" | "leadId" | "solesAccount" | "dollarAccount" | "createdAt" | "createdBy"
>;

export type LeadVenueAccounts = {
  solesAccount: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
};

export type LeadVenueRepository = {
  insert(values: LeadVenueInsert): Promise<string>;
  update(venueId: string, values: LeadVenueUpdate): Promise<void>;
  addAccounts(
    venueId: string,
    accounts: LeadVenueAccounts,
    now: number,
  ): Promise<void>;
  findById(id: string): Promise<Result<LeadVenue | undefined, DomainError>>;
  listByLeadId(leadId: string): Promise<Result<LeadVenue[], DomainError>>;
  countByLeadId(leadId: string): Promise<number>;
  countWithAccounts(leadId: string): Promise<number>;
};

export type LeadNegotiationRequest = {
  id: string;
  leadId: string;
  round: number;
  justification: string;
  requestedBy: number;
  requestedAt: number;
};

export type LeadNegotiationFile = {
  negotiationRequestId: string;
  artifactId: string;
  fileAssetId: number;
  uploadedByUserId: number;
  createdAt: number;
};

export type SubmitReadyNegotiationFile = {
  artifactId: string;
  fileAssetId: number;
};

export type NegotiationRequestRepository = {
  insert(values: LeadNegotiationRequest): Promise<void>;
  insertFile(values: LeadNegotiationFile & { leadId: string }): Promise<void>;
  findSubmitReadyNegotiationFile(input: {
    artifactId: string;
    leadId: string;
    uploadedByUserId: number;
  }): Promise<SubmitReadyNegotiationFile | null>;
  countByLeadId(leadId: string): Promise<number>;
  listByLeadId(leadId: string): Promise<LeadNegotiationRequest[]>;
};

export type OrganizationProfile = {
  id: OrganizationId;
  ruc: string;
  name: string;
  giroNegocio: string | null;
  address: string | null;
  district: string | null;
  province: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
};

export type LegalRepresentative = {
  organizationId: OrganizationId;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  telefono: string | null;
  email: string | null;
};

export type PartyRepository = {
  findOrganizationByRuc(ruc: string): Promise<OrganizationProfile | undefined>;
  findOrganizationById(
    id: OrganizationId,
  ): Promise<OrganizationProfile | undefined>;
  createOrganization(values: {
    ruc: string;
    name: string;
    address: string | null;
    district: string | null;
    department: string | null;
  }): Promise<OrganizationProfile>;
  updateOrganizationCommercial(values: {
    organizationId: OrganizationId;
    giroNegocio: string;
  }): Promise<void>;
  updateOrganizationFromEnrichment(values: {
    organizationId: OrganizationId;
    name?: string;
    address?: string;
    district?: string;
    department?: string;
  }): Promise<void>;
  upsertPrimaryLegalRepresentative(values: LegalRepresentative): Promise<void>;
  findPrimaryLegalRepresentative(
    organizationId: OrganizationId,
  ): Promise<LegalRepresentative | undefined>;
};

export type SunatSourceStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "stale";

export type LeadSourceStatus = {
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

export type SourceStatusRepository = {
  findByRuc(ruc: string): Promise<LeadSourceStatus>;
};

export type LeadSourcingPolicy = {
  branchId: number;
  engineAssignmentEnabled: boolean;
  updatedAt: number;
  updatedByUserId: number;
};

export type LeadSourcingPolicyRepository = {
  findByBranchId(branchId: number): Promise<LeadSourcingPolicy | undefined>;
  upsert(values: LeadSourcingPolicy): Promise<unknown>;
};

export type LeadUser = {
  id: number;
  isActive: boolean;
};

export type LeadUserWithName = {
  id: number;
  fullName: string;
};

export type AssignableExecutivesScope = {
  actorRole: "superuser" | "admin" | "sales_manager" | "supervisor";
  actorBranchId: number;
};

export type WorkflowUserRepository = {
  findById(id: number): Promise<LeadUser | undefined>;
  isExecutiveAssignable(
    scope: AssignableExecutivesScope,
    executiveId: number,
  ): Promise<boolean>;
  findByIds(ids: number[]): Promise<LeadUserWithName[]>;
  listAssignableExecutives(
    input: AssignableExecutivesScope,
    options?: { search?: string; limit?: number },
  ): Promise<LeadUserWithName[]>;
};
