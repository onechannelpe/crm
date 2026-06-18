import type { SunatEconomicActivity } from "~/server/client-search/enrichment/sunat/contracts";
import type { DomainError } from "~/server/shared/domain-error";
import type { OrganizationId } from "~/server/shared/ids";
import type { Result } from "~/server/shared/result";
import type {
  SettlementBank,
  CollectionMode,
  ProductScope,
  SaleVenueAccount,
  Currency,
} from "~/server/workflow/types";

export type CommercialProfileFields = {
  currentProvider: string;
  currentDebitRate: number;
  currentCreditRate: number;
  gpv: number;
  ticket: number;
  settlementBank: SettlementBank;
  posCount: number;
};

// Defaults to "none" scope at registration; populated at SETUP.
export type DigitalPolicyFields = {
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineCollectionMode: CollectionMode | null;
};

export type LeadProfile = {
  leadId: string;
} & CommercialProfileFields &
  DigitalPolicyFields & {
    updatedAt: number;
    updatedBy: number;
  };

type ProfileWrite<TFields> = {
  leadId: string;
  fields: TFields;
  updatedAt: number;
  updatedBy: number;
};

export type LeadProfileRepository = {
  findByLeadId(leadId: string): Promise<LeadProfile | undefined>;
  // Registration seeds the commercial row plus "none" digital defaults.
  createCommercialProfile(
    values: ProfileWrite<CommercialProfileFields>,
  ): Promise<void>;
  // Inline scope correction: rewrites only the commercial columns.
  updateCommercialScope(
    values: ProfileWrite<CommercialProfileFields>,
  ): Promise<void>;
  // SETUP digital policy: rewrites only the digital columns.
  updateDigitalPolicy(values: ProfileWrite<DigitalPolicyFields>): Promise<void>;
};

export type RateProposalOutcome = "pending" | "accepted" | "revision_requested";

export type RateProposal = {
  id: string;
  leadId: string;
  round: number;
  proposedDebitRate: number;
  proposedCreditRate: number;
  proposedForeignRate: number;
  fee: number;
  paybackPricing: number;
  currency: Currency;
  proposedBy: number;
  proposedAt: number;
  outcome: RateProposalOutcome;
  decidedAt: number | null;
};

export type RateProposalNumbers = {
  proposedDebitRate: number;
  proposedCreditRate: number;
  proposedForeignRate: number;
  fee: number;
  paybackPricing: number;
  currency: Currency;
};

export type RateProposalRepository = {
  insert(values: RateProposal): Promise<void>;
  listByLeadId(leadId: string): Promise<RateProposal[]>;
  findLatest(leadId: string): Promise<RateProposal | undefined>;
  nextRound(leadId: string): Promise<number>;
  updateNumbers(id: string, values: RateProposalNumbers): Promise<void>;
  markOutcome(
    id: string,
    outcome: RateProposalOutcome,
    decidedAt: number,
  ): Promise<void>;
};

export type RateProposalPolicyDefault = {
  branchId: number;
  validityDays: number;
  updatedAt: number;
  updatedByUserId: number;
};

export type RateProposalPolicyRepository = {
  findByBranchId(
    branchId: number,
  ): Promise<RateProposalPolicyDefault | undefined>;
  upsert(values: RateProposalPolicyDefault): Promise<unknown>;
};

export type LeadVenue = {
  id: string;
  leadId: string;
  nombreComercial: string;
  posQuantity: number;
  linkUrl: string | null;
  onlineUrl: string | null;
  onlineCollectionMode: CollectionMode | null;
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

export type RateRevision = {
  id: string;
  leadId: string;
  proposalId: string;
  round: number;
  justification: string;
  requestedBy: number;
  requestedAt: number;
};

export type RateRevisionFile = {
  revisionId: string;
  artifactId: string;
  fileAssetId: number;
  uploadedByUserId: number;
  createdAt: number;
};

export type SubmitReadyRevisionFile = {
  artifactId: string;
  fileAssetId: number;
};

export type RateRevisionRepository = {
  insert(values: RateRevision): Promise<void>;
  insertFile(values: RateRevisionFile & { leadId: string }): Promise<void>;
  findSubmitReadyRevisionFile(input: {
    artifactId: string;
    leadId: string;
    uploadedByUserId: number;
  }): Promise<SubmitReadyRevisionFile | null>;
  countByLeadId(leadId: string): Promise<number>;
  listByLeadId(leadId: string): Promise<RateRevision[]>;
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
