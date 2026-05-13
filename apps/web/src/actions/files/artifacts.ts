"use server";

import { assertPositiveInt } from "~/contracts/guards";
import { validationError } from "~/lib/app-errors";
import { listArtifacts } from "~/server/files/service/list-artifacts";
import { requestArtifact } from "~/server/files/service/request-artifact";
import { requestDownloadToken } from "~/server/files/service/request-download-token";
import { uploadArtifactFile } from "~/server/files/service/upload-artifact";
import type {
  ArtifactExecutionMode,
  ArtifactType,
  ArtifactWithAsset,
  WorkflowArtifact,
} from "~/server/files/types";
import { ABSOLUTE_MAX_UPLOAD_BYTES } from "~/server/files/validators";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function getFileDeps() {
  const { repo, storage, syncExecutor } = getServerRuntime().files;
  return { repo, storage, syncExecutor };
}

function parseListLimit(value: number | undefined): number {
  if (value === undefined) return 50;
  return Math.min(assertPositiveInt(value, "limit"), 200);
}

function parseListOffset(value: number | undefined): number {
  if (value === undefined) return 0;
  if (!Number.isInteger(value) || value < 0) {
    throw validationError("offset must be a non-negative integer");
  }
  return value;
}

function parseArtifactId(value: unknown): string {
  if (typeof value !== "string") {
    throw validationError("artifactId is required");
  }

  const normalized = value.trim();
  if (!normalized) {
    throw validationError("artifactId is required");
  }
  if (!UUID_PATTERN.test(normalized)) {
    throw validationError("artifactId is invalid");
  }
  return normalized;
}

export async function requestArtifactAction(input: {
  artifactType: ArtifactType;
  executionMode: ArtifactExecutionMode;
  workflowContext: Record<string, unknown>;
}): Promise<ArtifactWithAsset> {
  return runAction({
    actionName: "files.artifact.request",
    access: { kind: "permission", permission: "file:artifact:request" },
    input,
    execute: (ctx) => requestArtifact(ctx, input, getFileDeps()),
  });
}

export async function listArtifactsAction(input: {
  artifactType?: ArtifactType;
  limit?: number;
  offset?: number;
}): Promise<WorkflowArtifact[]> {
  const safeFilters = {
    artifactType: input.artifactType,
    limit: parseListLimit(input.limit),
    offset: parseListOffset(input.offset),
  };

  return runAction({
    actionName: "files.artifact.list",
    access: { kind: "permission", permission: "file:artifact:audit:read" },
    input: safeFilters,
    execute: (ctx) => listArtifacts(ctx, safeFilters, getFileDeps()),
  });
}

export async function requestDownloadTokenAction(
  artifactId: unknown,
): Promise<{ token: string }> {
  const safeArtifactId = parseArtifactId(artifactId);

  return runAction({
    actionName: "files.artifact.download_token",
    access: { kind: "permission", permission: "file:artifact:read" },
    input: { artifactId: safeArtifactId },
    execute: (ctx) => requestDownloadToken(ctx, safeArtifactId, getFileDeps()),
  });
}

export async function uploadArtifactAction(
  artifactId: unknown,
  formData: FormData,
): Promise<WorkflowArtifact> {
  const safeArtifactId = parseArtifactId(artifactId);

  return runAction({
    actionName: "files.artifact.upload",
    access: { kind: "permission", permission: "file:artifact:upload" },
    input: { artifactId: safeArtifactId },
    execute: async (ctx) => {
      const file = formData.get("file");
      if (!(file instanceof File)) {
        throw validationError("file is required");
      }
      if (file.size > ABSOLUTE_MAX_UPLOAD_BYTES) {
        throw validationError("file_too_large");
      }

      return uploadArtifactFile(
        ctx,
        safeArtifactId,
        { name: file.name, sizeBytes: file.size, stream: file.stream() },
        getFileDeps(),
      );
    },
  });
}
