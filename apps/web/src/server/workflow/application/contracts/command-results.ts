export type LeadCommandResult = {
  leadId: string;
};

export type LeadInteractionResult = {
  interactionId: string;
};

export type LeadQuotationResult = {
  id: string;
};

export type WorkflowFileStatus = "ready" | "processing" | "failed";

export type LeadSaleProofFileView = {
  id: number;
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
  uploadedAt: number;
  uploadedByUserId: number;
  status: WorkflowFileStatus;
};

export type LeadNegotiationFileView = {
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
};
