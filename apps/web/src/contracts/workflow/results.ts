export type LeadCommandResult = {
  leadId: string;
};

export type LeadSaleProofFileView = {
  id: string;
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
  uploadedAt: number;
  uploadedByUserId: string;
  status: "ready" | "processing" | "failed";
};

export type LeadRateRevisionFileView = {
  artifactId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
};
