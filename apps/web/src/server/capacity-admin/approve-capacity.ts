import type { SessionData } from "~/lib/auth/access/session";
import { canManageExecutive } from "~/server/capacity-policy/scope-access";
import {
  grantLeadCapacity,
  type GrantLeadCapacityCommand,
} from "~/server/capacity-usage/lead-usage";
import type {
  LeadCapacityGrantsRepo,
  SearchCapacityGrantsRepo,
} from "~/server/capacity-usage/repos";
import {
  grantSearchCapacity,
  type GrantSearchCapacityCommand,
} from "~/server/capacity-usage/search-usage";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { CapacityRequestId, TeamId, UserId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { normalizeDecisionNote } from "./domain";

export interface ApproveCapacityRequestCommand {
  actorUserId: SessionData["userId"];
  requestId: CapacityRequestId;
  note: string | null;
}

export interface RejectCapacityRequestCommand {
  actorUserId: SessionData["userId"];
  requestId: CapacityRequestId;
  note: string;
}

export interface ApproveRepos {
  capacityRequests: {
    findById(id: number): Promise<
      | {
          id: number;
          user_id: number;
          kind: string;
          status: string;
          requested_amount: number;
          reason: string;
        }
      | undefined
    >;
    markApproved(
      id: number,
      actorUserId: UserId,
      note: string | null,
    ): Promise<{ numUpdatedRows?: bigint } | undefined>;
    markRejected(
      id: number,
      actorUserId: UserId,
      note: string,
    ): Promise<{ numUpdatedRows?: bigint } | undefined>;
  };
  users: {
    findById(
      id: UserId,
    ): Promise<
      { role: string; branch_id: number; team_id: number | null } | undefined
    >;
  };
  teams: {
    findBySupervisorId(id: UserId): Promise<{ id: number } | undefined>;
    findByIdWithSupervisor(
      id: TeamId,
    ): Promise<
      | { id: number; branch_id: number; supervisor_id: number | null }
      | undefined
    >;
  };
  searchCapacityGrants: SearchCapacityGrantsRepo;
  leadCapacityGrants: LeadCapacityGrantsRepo;
}

export type ApproveTransactionRunner = <T>(
  operation: (repos: ApproveRepos) => Promise<T>,
) => Promise<T>;

class RollbackError extends Error {
  constructor(readonly domainErr: DomainError) {
    super(domainErr.message);
  }
}

function rollback(err: DomainError): never {
  throw new RollbackError(err);
}

export async function approveCapacityRequest(
  command: ApproveCapacityRequestCommand,
  actor: SessionData,
  runInTransaction: ApproveTransactionRunner,
): Promise<Result<{ success: true }, DomainError>> {
  try {
    const result = await runInTransaction(async (txRepos) => {
      const request = await txRepos.capacityRequests.findById(
        command.requestId,
      );
      if (!request)
        rollback(
          domainError("not_found", "request_not_found", "Request not found"),
        );

      if (request.status !== "pending")
        rollback(
          domainError(
            "conflict",
            "request_not_pending",
            "Request is no longer pending",
          ),
        );

      const managed = await canManageExecutive(actor, request.user_id, txRepos);
      if (!managed.target)
        rollback(
          domainError(
            "not_found",
            "request_target_not_found",
            "Request target not found",
          ),
        );
      if (!managed.ok)
        rollback(
          domainError("forbidden", "forbidden", "Cannot approve this request"),
        );

      const note = normalizeDecisionNote(command.note);
      const updateResult = await txRepos.capacityRequests.markApproved(
        request.id,
        command.actorUserId,
        note,
      );
      if (!updateResult?.numUpdatedRows)
        rollback(
          domainError(
            "conflict",
            "request_not_pending",
            "Request is no longer pending",
          ),
        );

      const grantCmd = {
        actorUserId: command.actorUserId,
        targetUserId: request.user_id,
        amount: request.requested_amount,
        reason: note ?? request.reason,
      };

      if (request.kind === "search_extra") {
        const grantResult = await grantSearchCapacity(
          grantCmd as GrantSearchCapacityCommand,
          txRepos,
        );
        if (isErr(grantResult)) rollback(grantResult.error);
      } else {
        const grantResult = await grantLeadCapacity(
          grantCmd as GrantLeadCapacityCommand,
          txRepos,
        );
        if (isErr(grantResult)) rollback(grantResult.error);
      }

      return { success: true as const };
    });

    return Ok(result);
  } catch (error) {
    if (error instanceof RollbackError) return Err(error.domainErr);
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error ? error.message : "Approval failed",
      ),
    );
  }
}

export async function rejectCapacityRequest(
  command: RejectCapacityRequestCommand,
  actor: SessionData,
  runInTransaction: ApproveTransactionRunner,
): Promise<Result<{ success: true }, DomainError>> {
  const note = normalizeDecisionNote(command.note);
  if (!note) {
    return Err(
      domainError(
        "validation",
        "decision_note_required",
        "Decision note is required for rejection",
      ),
    );
  }

  try {
    const result = await runInTransaction(async (txRepos) => {
      const request = await txRepos.capacityRequests.findById(
        command.requestId,
      );
      if (!request)
        rollback(
          domainError("not_found", "request_not_found", "Request not found"),
        );
      if (request.status !== "pending")
        rollback(
          domainError(
            "conflict",
            "request_not_pending",
            "Request is no longer pending",
          ),
        );

      const managed = await canManageExecutive(actor, request.user_id, txRepos);
      if (!managed.target)
        rollback(
          domainError(
            "not_found",
            "request_target_not_found",
            "Request target not found",
          ),
        );
      if (!managed.ok)
        rollback(
          domainError("forbidden", "forbidden", "Cannot reject this request"),
        );

      const updateResult = await txRepos.capacityRequests.markRejected(
        request.id,
        command.actorUserId,
        note,
      );
      if (!updateResult?.numUpdatedRows)
        rollback(
          domainError(
            "conflict",
            "request_not_pending",
            "Request is no longer pending",
          ),
        );

      return { success: true as const };
    });

    return Ok(result);
  } catch (error) {
    if (error instanceof RollbackError) return Err(error.domainErr);
    return Err(
      domainError(
        "unexpected",
        "unexpected",
        error instanceof Error ? error.message : "Rejection failed",
      ),
    );
  }
}
