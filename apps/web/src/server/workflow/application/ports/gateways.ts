export type WorkflowEngineGateway = {
  enrichByRuc(ruc: string): Promise<{
    razonSocial: string | null;
    address: string | null;
  } | null>;
};

export type LeadEnrichmentQueue = {
  enqueueRucVerification(ruc: string, requestedByUserId: number): Promise<void>;
};
