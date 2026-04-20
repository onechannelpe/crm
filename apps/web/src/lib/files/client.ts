export interface ArtifactResult {
  artifact: {
    id: number;
    artifactType: string;
    status: string;
    executionMode: string;
    direction: string;
    createdAt: number;
    updatedAt: number;
  };
  fileAsset: {
    id: number;
    safeDisplayFilename: string;
    detectedMime: string;
    sizeBytes: number;
  } | null;
}

export async function requestArtifact(input: {
  artifactType: string;
  executionMode: "sync" | "async";
  workflowContext?: Record<string, unknown>;
}): Promise<ArtifactResult> {
  const response = await fetch("/api/files/artifacts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      artifactType: input.artifactType,
      executionMode: input.executionMode,
      workflowContext: input.workflowContext ?? {},
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json() as Promise<ArtifactResult>;
}

export async function uploadArtifactFile(
  artifactId: number,
  file: File,
): Promise<{ id: number; status: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/files/artifacts/${artifactId}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Upload failed: ${response.status}`);
  }
  return response.json() as Promise<{ id: number; status: string }>;
}

export async function requestDownloadToken(
  artifactId: number,
): Promise<string> {
  const response = await fetch(
    `/api/files/artifacts/${artifactId}/download-token`,
    { method: "POST" },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Token request failed: ${response.status}`);
  }
  const data = (await response.json()) as { token: string };
  return data.token;
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
  artifactType: string,
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
