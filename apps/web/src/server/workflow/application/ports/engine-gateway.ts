export type WorkflowEngineGateway = {
  enrichByRuc(ruc: string): Promise<{
    razonSocial: string | null;
    address: string | null;
  } | null>;
};
