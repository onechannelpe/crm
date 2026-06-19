import type { SunatEconomicActivity } from "~/server/client-search/enrichment/sunat/contracts";
import type {
  SettlementBank,
  CollectionMode,
  ProductScope,
} from "~/server/workflow/types";

import type { SunatSourceStatus } from "../ports/entities";

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

export type LeadDetailProfileView = {
  leadId: string;
  currentProvider: string;
  currentDebitRate: number;
  currentCreditRate: number;
  gpv: number;
  ticket: number;
  giroNegocio: string | null;
  settlementBank: SettlementBank;
  posCount: number;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineCollectionMode: CollectionMode | null;
};

export type LeadDetailRepLegalView = {
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  telefono: string | null;
  email: string | null;
};

export type LeadDetailRateRevisionFileView = {
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
};
