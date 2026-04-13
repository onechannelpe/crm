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
    payloadAvailable: boolean;
  };
};

export type SourceStatusRepository = {
  findByRuc(ruc: string): Promise<LeadSourceStatus>;
};
