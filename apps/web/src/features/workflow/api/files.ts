import { requestLeadSaleProofDownloadToken, listLeadSaleProofFiles, uploadLeadSaleProofFile } from "~/actions/workflow/files";
import { requestNegotiationFileDownloadToken, uploadLeadNegotiationFile } from "~/actions/workflow/negotiation-files";

export async function listWorkflowSaleProofFiles(leadId: string) {
  return listLeadSaleProofFiles(leadId);
}

export async function uploadWorkflowSaleProofFile(leadId: string, formData: FormData) {
  return uploadLeadSaleProofFile(leadId, formData);
}

export async function requestWorkflowSaleProofDownloadToken(input: {
  leadId: string;
  artifactId: string;
}) {
  return requestLeadSaleProofDownloadToken(input);
}

export async function uploadWorkflowNegotiationFile(leadId: string, formData: FormData) {
  return uploadLeadNegotiationFile(leadId, formData);
}

export async function requestWorkflowNegotiationDownloadToken(input: {
  leadId: string;
  artifactId: string;
}) {
  return requestNegotiationFileDownloadToken(input);
}
