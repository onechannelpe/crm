export type LeadCommandResult = {
  leadId: string;
};

export type LeadSaleProofFileView = {
  id: string;
  fileId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
  uploadedAt: number;
  uploadedByUserId: string;
  status: "ready" | "processing" | "failed";
};

export type LeadRateRevisionFileView = {
  fileId: string;
  filename: string;
  detectedMime: string;
  sizeBytes: number;
};
