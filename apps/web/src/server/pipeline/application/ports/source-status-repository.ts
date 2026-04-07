export type LeadSourceStatus = {
  engine: {
    status: "available" | "missing" | "failed";
    fetchedAt: number | null;
    fields: Array<"razonSocial" | "address">;
  };
  sunat: {
    status: "idle" | "queued" | "running" | "completed" | "failed" | "stale";
    fetchedAt: number | null;
    legalName: string | null;
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
