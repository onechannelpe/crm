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
  currentProvider: string | null;
  currentDebitRate: number | null;
  currentCreditRate: number | null;
  gpv: number | null;
  ticket: number | null;
  giroNegocio: string | null;
  settlementBank: SettlementBank | null;
  posCount: number | null;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineCollectionMode: CollectionMode | null;
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

export type LeadDetailRateRevisionFileView = {
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
};
