export type LeadNegotiationRequest = {
  id: string;
  leadId: string;
  round: number;
  justification: string;
  requestedBy: number;
  requestedAt: number;
};

export type LeadNegotiationFile = {
  negotiationRequestId: string;
  artifactId: string;
  fileAssetId: number;
  uploadedByUserId: number;
  createdAt: number;
};

export type NegotiationRequestRepository = {
  insert(values: Omit<LeadNegotiationRequest, "id">): Promise<string>;
  insertFile(values: LeadNegotiationFile & { leadId: string }): Promise<void>;
  findFileAssetIdForArtifact(
    artifactId: string,
    leadId: string,
  ): Promise<number | null>;
  countByLeadId(leadId: string): Promise<number>;
  listByLeadId(leadId: string): Promise<LeadNegotiationRequest[]>;
};
