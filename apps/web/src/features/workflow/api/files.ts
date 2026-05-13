import {
  requestLeadSaleProofDownloadToken,
  listLeadSaleProofFiles,
  uploadLeadSaleProofFile,
} from "~/actions/workflow/files";
import {
  requestNegotiationFileDownloadToken,
  uploadLeadNegotiationFile,
} from "~/actions/workflow/negotiation-files";
import type { LeadArtifactInput } from "~/contracts/workflow/inputs";

export async function listLeadSaleProofFilesApi(leadId: string) {
  return listLeadSaleProofFiles(leadId);
}

export async function uploadLeadSaleProofFileApi(
  leadId: string,
  formData: FormData,
) {
  return uploadLeadSaleProofFile(leadId, formData);
}

export async function requestLeadSaleProofDownloadTokenApi(
  input: LeadArtifactInput,
) {
  return requestLeadSaleProofDownloadToken(input);
}

export async function uploadLeadNegotiationFileApi(
  leadId: string,
  formData: FormData,
) {
  return uploadLeadNegotiationFile(leadId, formData);
}

export async function requestNegotiationFileDownloadTokenApi(
  input: LeadArtifactInput,
) {
  return requestNegotiationFileDownloadToken(input);
}
