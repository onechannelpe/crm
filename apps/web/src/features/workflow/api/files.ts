import { requestLeadSaleProofDownloadToken, listLeadSaleProofFiles, uploadLeadSaleProofFile } from "~/actions/workflow/files";
import { requestNegotiationFileDownloadToken, uploadLeadNegotiationFile } from "~/actions/workflow/negotiation-files";

export async function listLeadSaleProofFilesApi(leadId: string) {
  return listLeadSaleProofFiles(leadId);
}

export async function uploadLeadSaleProofFileApi(leadId: string, formData: FormData) {
  return uploadLeadSaleProofFile(leadId, formData);
}

export async function requestLeadSaleProofDownloadTokenApi(input: {
  leadId: string;
  artifactId: string;
}) {
  return requestLeadSaleProofDownloadToken(input);
}

export async function uploadLeadNegotiationFileApi(leadId: string, formData: FormData) {
  return uploadLeadNegotiationFile(leadId, formData);
}

export async function requestNegotiationFileDownloadTokenApi(input: {
  leadId: string;
  artifactId: string;
}) {
  return requestNegotiationFileDownloadToken(input);
}
