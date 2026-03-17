import type { SessionData } from "~/lib/auth/access/session";
import { normalizeDecisionNote } from "~/server/capacity/domain";
import type { CapacityApprovalError } from "~/server/capacity/errors";
import { createTransactionCapacityGrantServices } from "~/server/capacity/grant-services";
import { asUserId } from "~/server/shared/ids";
import type { CapacityRequestId, UserId } from "~/server/shared/ids";
import type { Repositories } from "~/server/shared/registry";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import type { RepositoryTransactionRunner } from "~/server/shared/transaction";

import { canManageExecutive } from "./scope";

export type { CapacityApprovalError } from "~/server/capacity/errors";

interface CapacityApprovalServiceDeps {
  runInRepositoryTransaction: RepositoryTransactionRunner;
  createGrantServices?: typeof createTransactionCapacityGrantServices;
}

type CapacityRequestRecord = NonNullable<
  Awaited<ReturnType<Repositories["capacityRequests"]["findById"]>>
>;

class TransactionRollbackError extends Error {
  constructor(readonly error: CapacityApprovalError) {
    super(error.message);
    this.name = "TransactionRollbackError";
  }
}

function toUnexpected(error: unknown, fallback: string): CapacityApprovalError {
  return {
    reason: "unexpected",
    message: error instanceof Error ? error.message : fallback,
  };
}

function throwRollback(error: CapacityApprovalError): never {
  throw new TransactionRollbackError(error);
}

function mapGrantError(error: {
  reason: "user_not_found" | "unexpected";
  message: string;
}): CapacityApprovalError {
  if (error.reason === "user_not_found") {
    return { reason: "not_found", message: error.message };
  }
  return { reason: "unexpected", message: error.message };
}

export function createCapacityApprovalService(
  deps: CapacityApprovalServiceDeps,
) {
  const createGrantServices =
    deps.createGrantServices ?? createTransactionCapacityGrantServices;

  async function assertApprovalAccessInTransaction(
    actor: SessionData,
    requestId: CapacityRequestId,
    transactionRepos: Repositories,
    deniedMessage: string,
  ): Promise<Result<CapacityRequestRecord, CapacityApprovalError>> {
    const request = await transactionRepos.capacityRequests.findById(requestId);
    if (!request) {
      return Err({ reason: "not_found", message: "Request not found" });
    }

    const managed = await canManageExecutive(
      actor,
      asUserId(request.user_id),
      transactionRepos,
    );
    if (!managed.target) {
      return Err({ reason: "not_found", message: "Request target not found" });
    }
    if (!managed.ok) {
      return Err({ reason: "forbidden", message: deniedMessage });
    }

    return Ok(request);
  }

  async function approveInTransaction(input: {
    actorUserId: UserId;
    request: CapacityRequestRecord;
    note: string | null;
    transactionRepos: Repositories;
  }): Promise<Result<{ success: true }, CapacityApprovalError>> {
    const request = input.request;
    if (request.status !== "pending") {
      return Err({
        reason: "conflict",
        message: "Request is no longer pending",
      });
    }

    const updateResult =
      await input.transactionRepos.capacityRequests.markApproved(
        request.id,
        input.actorUserId,
        input.note,
      );
    if (!updateResult.numUpdatedRows) {
      return Err({
        reason: "conflict",
        message: "Request is no longer pending",
      });
    }

    const grants = createGrantServices(input.transactionRepos);

    if (request.kind === "search_extra") {
      const grantResult =
        await grants.searchAllowanceService.grantExtraSearchAllowance(
          input.actorUserId,
          asUserId(request.user_id),
          request.requested_amount,
          input.note ?? request.reason,
        );
      if (isErr(grantResult)) {
        return Err(mapGrantError(grantResult.error));
      }

      return Ok({ success: true as const });
    }

    const grantResult =
      await grants.leadRefillGrantService.grantExtraLeadRefill(
        input.actorUserId,
        asUserId(request.user_id),
        request.requested_amount,
        input.note ?? request.reason,
      );
    if (isErr(grantResult)) {
      return Err(mapGrantError(grantResult.error));
    }

    return Ok({ success: true as const });
  }

  return {
    async approveCapacityRequest(
      actor: SessionData,
      requestId: CapacityRequestId,
      note?: string,
    ): Promise<Result<{ success: true }, CapacityApprovalError>> {
      try {
        const result = await deps.runInRepositoryTransaction(
          async (transactionRepos) => {
            const access = await assertApprovalAccessInTransaction(
              actor,
              requestId,
              transactionRepos,
              "Cannot approve this request",
            );
            if (isErr(access)) {
              throwRollback(access.error);
            }

            const approval = await approveInTransaction({
              actorUserId: actor.userId,
              request: access.value,
              note: normalizeDecisionNote(note),
              transactionRepos,
            });
            if (isErr(approval)) {
              throwRollback(approval.error);
            }
            return approval.value;
          },
        );

        return Ok(result);
      } catch (error) {
        if (error instanceof TransactionRollbackError) {
          return Err(error.error);
        }
        return Err(toUnexpected(error, "Approval failed"));
      }
    },

    async rejectCapacityRequest(
      actor: SessionData,
      requestId: CapacityRequestId,
      note: string,
    ): Promise<Result<{ success: true }, CapacityApprovalError>> {
      try {
        const decisionNote = normalizeDecisionNote(note);
        if (!decisionNote) {
          return Err({
            reason: "validation",
            message: "Decision note is required",
          });
        }

        const result = await deps.runInRepositoryTransaction(
          async (transactionRepos) => {
            const access = await assertApprovalAccessInTransaction(
              actor,
              requestId,
              transactionRepos,
              "Cannot reject this request",
            );
            if (isErr(access)) {
              throwRollback(access.error);
            }

            if (access.value.status !== "pending") {
              throwRollback({
                reason: "conflict",
                message: "Request is no longer pending",
              });
            }

            const updateResult =
              await transactionRepos.capacityRequests.markRejected(
                access.value.id,
                actor.userId,
                decisionNote,
              );
            if (!updateResult.numUpdatedRows) {
              throwRollback({
                reason: "conflict",
                message: "Request is no longer pending",
              });
            }

            return { success: true as const };
          },
        );

        return Ok(result);
      } catch (error) {
        if (error instanceof TransactionRollbackError) {
          return Err(error.error);
        }
        return Err(toUnexpected(error, "Rejection failed"));
      }
    },
  };
}
