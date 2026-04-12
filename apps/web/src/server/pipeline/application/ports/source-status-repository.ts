export type SunatSourceStatus =
  | "idle"
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "stale";

export type LeadSourceStatus = {
  engine: {
    status: "available" | "missing" | "failed";
    fetchedAt: number | null;
    fields: Array<"razonSocial" | "address">;
  };
  sunat: {
    status: SunatSourceStatus;
    fetchedAt: number | null;
    legalName: string | null;
    address: string | null;
    district: string | null;
    department: string | null;
    contributorStatus: string | null;
    contributorCondition: string | null;
    payloadAvailable: boolean;
  };
};

export type SourceStatusRepository = {
  findByLead(input: {
    ruc: string;
    razonSocial: string | null;
    address: string | null;
    leadUpdatedAt: number;
  }): Promise<LeadSourceStatus>;
};
