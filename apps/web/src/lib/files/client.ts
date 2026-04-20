import {
  requestArtifactAction,
  requestDownloadTokenAction,
  uploadArtifactAction,
} from "~/actions/files/artifacts";
import type {
  ArtifactExecutionMode,
  ArtifactType,
  ArtifactWithAsset,
  WorkflowArtifact,
} from "~/server/files/types";

export async function requestArtifact(input: {
  artifactType: ArtifactType;
  executionMode: ArtifactExecutionMode;
  workflowContext?: Record<string, unknown>;
}): Promise<ArtifactWithAsset> {
  return requestArtifactAction({
    artifactType: input.artifactType,
    executionMode: input.executionMode,
    workflowContext: input.workflowContext ?? {},
  });
}

export async function uploadArtifactFile(
  artifactId: number,
  file: File,
): Promise<WorkflowArtifact> {
  const formData = new FormData();
  formData.append("file", file);
  return uploadArtifactAction(artifactId, formData);
}

export async function requestDownloadToken(
  artifactId: number,
): Promise<string> {
  const result = await requestDownloadTokenAction(artifactId);
  return result.token;
}

export function downloadWithToken(token: string): void {
  const link = document.createElement("a");
  link.href = `/api/files/download/${token}`;
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function requestAndDownload(
  artifactType: ArtifactType,
  workflowContext: Record<string, unknown> = {},
): Promise<void> {
  const artifact = await requestArtifact({
    artifactType,
    executionMode: "sync",
    workflowContext,
  });
  const token = await requestDownloadToken(artifact.artifact.id);
  downloadWithToken(token);
}
