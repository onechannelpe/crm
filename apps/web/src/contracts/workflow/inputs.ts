import type { SaleVenueAccount, VenueDigitalConfig } from "./primitives";
import type {
  SettlementBank,
  LeadPriority,
  LeadStage,
  LeadStatus,
  CollectionMode,
  Currency,
  ProductScope,
} from "./vocabulary";

export type ListLeadsFiltersInput = {
  stage?: LeadStage;
  status?: LeadStatus;
  priority?: LeadPriority;
  executiveId?: number;
  anyFieldSearch?: string;
  updatedSinceMs?: number;
  updatedUntilMs?: number;
  sortBy?: "createdAt" | "updatedAt" | "registeredBy" | "ruc";
  sortDirection?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export type ListAssignableExecutivesInput = {
  leadId: string;
  search?: string;
  limit?: number;
};

export type CommercialScope = {
  currentProvider: string;
  currentDebitRate: number;
  currentCreditRate: number;
  gpv: number;
  ticket: number;
  giroNegocio: string;
  settlementBank: SettlementBank;
  posCount: number;
};

export type CreateLeadInput = { ruc: string } & CommercialScope;

export type EditCommercialScopeInput = { leadId: string } & CommercialScope;

export type ReassignLeadInput = {
  leadId: string;
  newExecutiveId: number;
};

export type AddLeadNoteInput = {
  leadId: string;
  body: string;
};

export type ProposeRateInput = {
  leadId: string;
  proposedDebitRate: number;
  proposedCreditRate: number;
  proposedForeignRate: number;
  fee: number;
  paybackPricing: number;
  currency: Currency;
};

export type AcceptRateInput = {
  leadId: string;
  proposalId: string;
};

export type EditRateProposalInput = {
  leadId: string;
  proposalId: string;
  proposedDebitRate: number;
  proposedCreditRate: number;
  proposedForeignRate: number;
  fee: number;
  paybackPricing: number;
  currency: Currency;
};

export type SaveDigitalPolicyInput = {
  leadId: string;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineCollectionMode: CollectionMode | null;
};

export type RecordRepLegalInput = {
  leadId: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  telefono: string;
  email: string;
};

export type CreateVenueInput = {
  leadId: string;
  tradeName: string;
  posQuantity: number;
  digitalConfig?: VenueDigitalConfig;
  address: string;
  addressReference: string;
  district: string;
  province: string;
  department: string;
};

export type UpdateVenueInput = CreateVenueInput & {
  venueId: string;
};

export type AddVenueAccountsInput = {
  leadId: string;
  venueId: string;
  solesAccount: SaleVenueAccount & { currency: "PEN" };
  dollarAccount?: SaleVenueAccount & { currency: "USD" };
};

export type RequestRateRevisionInput = {
  leadId: string;
  justification: string;
  artifactIds: string[];
};
