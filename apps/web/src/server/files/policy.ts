import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { ArtifactType, WorkflowArtifact } from "./types";

export type PolicyAction =
  | "artifact.request"
  | "artifact.upload"
  | "artifact.read"
  | "artifact.revoke"
  | "artifact.audit.read";

export interface PolicyActor {
  userId: number;
  role: Role;
  branchId: number;
}

const ARTIFACT_DIRECTIONS: Record<
  ArtifactType,
  "upload" | "download" | "bidirectional"
> = {
  leads_export: "download",
  integration_import: "upload",
};

function deny(code: string, message: string): Result<void, DomainError> {
  return Err(domainError("forbidden", code, message));
}

function allow(): Result<void, DomainError> {
  return Ok(undefined);
}

function canRequest(
  actor: PolicyActor,
  artifactType: ArtifactType,
): Result<void, DomainError> {
  if (!hasPermission(actor.role, "file:artifact:request")) {
    return deny(
      "artifact_request_forbidden",
      "Not authorized to request artifacts",
    );
  }

  if (artifactType === "leads_export" && actor.role === "executive") {
    return deny(
      "executive_cross_scope_denied",
      "Executives cannot request exports",
    );
  }

  return allow();
}

function canUpload(
  actor: PolicyActor,
  artifact: WorkflowArtifact,
): Result<void, DomainError> {
  if (!hasPermission(actor.role, "file:artifact:upload")) {
    return deny(
      "artifact_upload_forbidden",
      "Not authorized to upload artifacts",
    );
  }

  const dir = ARTIFACT_DIRECTIONS[artifact.artifactType];
  if (dir === "download") {
    return deny(
      "artifact_not_uploadable",
      "This artifact type does not accept uploads",
    );
  }

  if (
    artifact.requestedByUserId !== actor.userId &&
    actor.role !== "admin" &&
    actor.role !== "superuser"
  ) {
    return deny(
      "artifact_upload_not_owner",
      "Only the requester may upload to this artifact",
    );
  }

  if (artifact.status !== "requested") {
    return deny(
      "artifact_upload_wrong_status",
      "Artifact is not in uploadable state",
    );
  }

  return allow();
}

function canRead(
  actor: PolicyActor,
  artifact: WorkflowArtifact,
): Result<void, DomainError> {
  if (!hasPermission(actor.role, "file:artifact:read")) {
    return deny("artifact_read_forbidden", "Not authorized to read artifacts");
  }

  if (artifact.status === "revoked" || artifact.status === "expired") {
    return deny("artifact_unavailable", "Artifact is no longer available");
  }

  if (actor.role === "superuser" || actor.role === "admin") {
    return allow();
  }

  if (artifact.requestedByUserId === actor.userId) {
    return allow();
  }

  if (artifact.scopeBranchId === null) {
    return deny(
      "artifact_read_not_owner",
      "Only requester or elevated roles may read this artifact",
    );
  }

  if (artifact.scopeBranchId !== actor.branchId) {
    return deny("artifact_scope_mismatch", "Artifact is outside your scope");
  }

  return allow();
}

function canRevoke(
  actor: PolicyActor,
  artifact: WorkflowArtifact,
): Result<void, DomainError> {
  if (actor.role !== "admin" && actor.role !== "superuser") {
    return deny(
      "artifact_revoke_forbidden",
      "Not authorized to revoke artifacts",
    );
  }

  if (artifact.status === "revoked" || artifact.status === "expired") {
    return deny(
      "artifact_already_terminal",
      "Artifact is already in a terminal state",
    );
  }

  return allow();
}

function canReadAudit(actor: PolicyActor): Result<void, DomainError> {
  if (!hasPermission(actor.role, "file:artifact:audit:read")) {
    return deny(
      "artifact_audit_forbidden",
      "Not authorized to read artifact audit history",
    );
  }

  return allow();
}

export function checkArtifactPolicy(
  actor: PolicyActor,
  artifact: WorkflowArtifact | null,
  action: PolicyAction,
): Result<void, DomainError> {
  switch (action) {
    case "artifact.request":
      return canRequest(actor, artifact?.artifactType ?? "leads_export");
    case "artifact.upload":
      if (!artifact) {
        return deny("artifact_not_found", "Artifact not found");
      }
      return canUpload(actor, artifact);
    case "artifact.read":
      if (!artifact) {
        return deny("artifact_not_found", "Artifact not found");
      }
      return canRead(actor, artifact);
    case "artifact.revoke":
      if (!artifact) {
        return deny("artifact_not_found", "Artifact not found");
      }
      return canRevoke(actor, artifact);
    case "artifact.audit.read":
      return canReadAudit(actor);
    default: {
      const _unreachable: never = action;
      return deny("unknown_action", `Unknown action: ${String(_unreachable)}`);
    }
  }
}
