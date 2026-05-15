export type LeadCommandResult = {
  leadId: string;
};

export type LeadInteractionResult = {
  interactionId: string;
};

export type LeadQuotationResult = {
  id: string;
};

export type LeadSaleProofFileView = {
  id: number;
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
  uploadedAt: number;
  uploadedByUserId: number;
  status: "ready" | "processing" | "failed";
};

export type LeadNegotiationFileView = {
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
};
