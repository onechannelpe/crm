import type { SaleVenueAccount, VenueDigitalConfig } from "./primitives";
import type {
  SettlementBank,
  LeadPriority,
  LeadStage,
  LeadStatus,
  CollectionMode,
  Currency,
  CloseReason,
  ProductScope,
  ProductKind,
} from "./vocabulary";

export type ListLeadsFiltersInput = {
  stage?: LeadStage;
  status?: LeadStatus;
  priority?: LeadPriority;
  executiveId?: string;
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
  lineOfBusiness: string;
  settlementBank: SettlementBank;
  posCount: number;
};

export type CreateLeadInput = { ruc: string } & CommercialScope;

export type EditCommercialScopeInput = { leadId: string } & CommercialScope;

export type ReassignLeadInput = {
  leadId: string;
  newExecutiveId: string;
};

export type ReviewLeadInput = {
  leadId: string;
  status: LeadStatus;
  priority: LeadPriority;
  reason: string;
};

export type RestartQuotationInput = {
  leadId: string;
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

export type CloseLeadInput = {
  leadId: string;
  reason: CloseReason;
  note: string | null;
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
  fileIds: string[];
};

export type ChooseFulfillmentProductInput = {
  leadId: string;
  productKind: ProductKind;
};

export type AttachFulfillmentDocumentInput = {
  leadId: string;
  fileId: string;
};

export type RecordUnitSerialInput = {
  leadId: string;
  unitId: string;
  serial: string;
};

export type RegisterUnitPaymentLinkInput = {
  leadId: string;
  unitId: string;
  paymentUrl: string;
};

export type UploadUnitPaymentProofInput = {
  leadId: string;
  unitId: string;
  fileId: string;
};

export type RegisterUnitSaleInput = {
  leadId: string;
  unitId: string;
  serviceRef: string;
};

export type ValidateFulfillmentPaymentInput = {
  leadId: string;
};

export type RejectFulfillmentStepInput = {
  leadId: string;
  reason: string;
};
