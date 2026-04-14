export type SunatSourceStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "stale";

export type LeadSunatEconomicActivity = {
  kind: "principal" | "secondary";
  label: string;
  code: string;
  description: string;
};

export type LeadSourceStatus = {
  sunat: {
    status: SunatSourceStatus;
    fetchedAt: number | null;
    district: string | null;
    department: string | null;
    contributorStatus: string | null;
    contributorCondition: string | null;
    economicActivities: LeadSunatEconomicActivity[];
    payloadAvailable: boolean;
  };
};

export type SourceStatusRepository = {
  findByRuc(ruc: string): Promise<LeadSourceStatus>;
};
