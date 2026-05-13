import {
  requestLeadSaleProofDownloadToken,
  listLeadSaleProofFiles,
  uploadLeadSaleProofFile,
} from "~/actions/files/lead-artifacts";
import {
  requestNegotiationFileDownloadToken,
  uploadLeadNegotiationFile,
} from "~/actions/files/lead-artifacts";
import type { LeadArtifactInput } from "~/contracts/workflow";

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
