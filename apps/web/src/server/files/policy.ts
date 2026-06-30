import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import { forbidden, type DomainError } from "~/server/shared/domain-error";
import type { BranchId, UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  EXECUTIVE_OWNED_ARTIFACT_TYPES,
  type ArtifactType,
  type WorkflowArtifact,
} from "./types";

const EXECUTIVE_OWNED = new Set<ArtifactType>(EXECUTIVE_OWNED_ARTIFACT_TYPES);

// Executives may request/upload/read these artifact kinds on their own leads
// without the broad file:artifact:* grant the back office carries.
function isExecutiveOwned(
  actor: PolicyActor,
  artifactType: ArtifactType,
): boolean {
  return actor.role === "executive" && EXECUTIVE_OWNED.has(artifactType);
}

export type PolicyAction =
  | "artifact.request"
  | "artifact.upload"
  | "artifact.read"
  | "artifact.revoke"
  | "artifact.audit.read";

export interface PolicyActor {
  userId: UserId;
  role: Role;
  branchId: BranchId;
}

const ARTIFACT_DIRECTIONS: Record<
  ArtifactType,
  "upload" | "download" | "bidirectional"
> = {
  records_export: "download",
  integration_import: "upload",
  sale_proof: "upload",
  rate_revision_file: "upload",
  transactions_report: "upload",
  addendum_unsigned: "upload",
  addendum_signed_photo: "upload",
  addendum_signed_pdf: "upload",
  payment_proof: "upload",
};

function deny(code: string): Result<void, DomainError> {
  return Err(forbidden({ code }));
}

function allow(): Result<void, DomainError> {
  return Ok(undefined);
}

function canRequest(
  actor: PolicyActor,
  artifactType: ArtifactType,
): Result<void, DomainError> {
  if (isExecutiveOwned(actor, artifactType)) {
    return allow();
  }

  if (!hasPermission(actor.role, "file:artifact:request")) {
    return deny("artifact_request_forbidden");
  }

  if (artifactType === "records_export" && actor.role === "executive") {
    return deny("executive_cross_scope_denied");
  }

  return allow();
}

function canUpload(
  actor: PolicyActor,
  artifact: WorkflowArtifact,
): Result<void, DomainError> {
  if (!isExecutiveOwned(actor, artifact.artifactType)) {
    if (!hasPermission(actor.role, "file:artifact:upload")) {
      return deny("artifact_upload_forbidden");
    }
  }

  const dir = ARTIFACT_DIRECTIONS[artifact.artifactType];
  if (dir === "download") {
    return deny("artifact_not_uploadable");
  }

  if (
    artifact.requestedByUserId !== actor.userId &&
    actor.role !== "admin" &&
    actor.role !== "superuser"
  ) {
    return deny("artifact_upload_not_owner");
  }

  if (artifact.status !== "requested") {
    return deny("artifact_upload_wrong_status");
  }

  return allow();
}

function canRead(
  actor: PolicyActor,
  artifact: WorkflowArtifact,
): Result<void, DomainError> {
  if (
    !isExecutiveOwned(actor, artifact.artifactType) &&
    !hasPermission(actor.role, "file:artifact:read")
  ) {
    return deny("artifact_read_forbidden");
  }

  if (artifact.status === "revoked" || artifact.status === "expired") {
    return deny("artifact_unavailable");
  }

  if (actor.role === "superuser" || actor.role === "admin") {
    return allow();
  }

  if (artifact.requestedByUserId === actor.userId) {
    return allow();
  }

  if (artifact.scopeBranchId === null) {
    return deny("artifact_read_not_owner");
  }

  if (artifact.scopeBranchId !== actor.branchId) {
    return deny("artifact_scope_mismatch");
  }

  return allow();
}

function canRevoke(
  actor: PolicyActor,
  artifact: WorkflowArtifact,
): Result<void, DomainError> {
  if (actor.role !== "admin" && actor.role !== "superuser") {
    return deny("artifact_revoke_forbidden");
  }

  if (artifact.status === "revoked" || artifact.status === "expired") {
    return deny("artifact_already_terminal");
  }

  return allow();
}

function canReadAudit(actor: PolicyActor): Result<void, DomainError> {
  if (!hasPermission(actor.role, "file:artifact:audit:read")) {
    return deny("artifact_audit_forbidden");
  }

  return allow();
}

export function checkArtifactPolicy(
  actor: PolicyActor,
  artifact: WorkflowArtifact | null,
  action: PolicyAction,
  requestArtifactType?: ArtifactType,
): Result<void, DomainError> {
  switch (action) {
    case "artifact.request":
      return canRequest(
        actor,
        requestArtifactType ?? artifact?.artifactType ?? "records_export",
      );
    case "artifact.upload":
      if (!artifact) {
        return deny("artifact_not_found");
      }
      return canUpload(actor, artifact);
    case "artifact.read":
      if (!artifact) {
        return deny("artifact_not_found");
      }
      return canRead(actor, artifact);
    case "artifact.revoke":
      if (!artifact) {
        return deny("artifact_not_found");
      }
      return canRevoke(actor, artifact);
    case "artifact.audit.read":
      return canReadAudit(actor);
    default: {
      action satisfies never;
      return deny("unknown_action");
    }
  }
}
