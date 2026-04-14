import type { SunatEconomicActivity } from "~/server/client-search/enrichment/sunat/contracts";

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
