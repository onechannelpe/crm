import type { SessionData } from "~/lib/auth/access/session";
import { normalizeDecisionNote } from "~/server/capacity/domain";
import { createTransactionCapacityGrantServices } from "~/server/capacity/grant-services";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { asUserId } from "~/server/shared/ids";
import type { CapacityRequestId, UserId } from "~/server/shared/ids";
import type { Repositories } from "~/server/shared/registry";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import type { RepositoryTransactionRunner } from "~/server/shared/transaction";

import { canManageExecutive } from "./scope";

interface CapacityApprovalServiceDeps {
  runInRepositoryTransaction: RepositoryTransactionRunner;
  createGrantServices?: typeof createTransactionCapacityGrantServices;
}

type CapacityRequestRecord = NonNullable<
  Awaited<ReturnType<Repositories["capacityRequests"]["findById"]>>
>;

class TransactionRollbackError extends Error {
  constructor(readonly error: DomainError) {
    super(error.message);
    this.name = "TransactionRollbackError";
  }
}

function toUnexpected(error: unknown, fallback: string): DomainError {
  return domainError(
    "unexpected",
    "unexpected",
    error instanceof Error ? error.message : fallback,
  );
}

function throwRollback(error: DomainError): never {
  throw new TransactionRollbackError(error);
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
  ): Promise<Result<CapacityRequestRecord, DomainError>> {
    const request = await transactionRepos.capacityRequests.findById(requestId);
    if (!request) {
      return Err(
        domainError("not_found", "request_not_found", "Request not found"),
      );
    }

    const managed = await canManageExecutive(
      actor,
      asUserId(request.user_id),
      transactionRepos,
    );
    if (!managed.target) {
      return Err(
        domainError(
          "not_found",
          "request_target_not_found",
          "Request target not found",
        ),
      );
    }
    if (!managed.ok) {
      return Err(domainError("forbidden", "forbidden", deniedMessage));
    }

    return Ok(request);
  }

  async function approveInTransaction(input: {
    actorUserId: UserId;
    request: CapacityRequestRecord;
    note: string | null;
    transactionRepos: Repositories;
  }): Promise<Result<{ success: true }, DomainError>> {
    const request = input.request;
    if (request.status !== "pending") {
      return Err(
        domainError(
          "conflict",
          "request_not_pending",
          "Request is no longer pending",
        ),
      );
    }

    const updateResult =
      await input.transactionRepos.capacityRequests.markApproved(
        request.id,
        input.actorUserId,
        input.note,
      );
    if (!updateResult.numUpdatedRows) {
      return Err(
        domainError(
          "conflict",
          "request_not_pending",
          "Request is no longer pending",
        ),
      );
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
        return Err(grantResult.error);
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
      return Err(grantResult.error);
    }

    return Ok({ success: true as const });
  }

  return {
    async approveCapacityRequest(
      actor: SessionData,
      requestId: CapacityRequestId,
      note?: string,
    ): Promise<Result<{ success: true }, DomainError>> {
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
    ): Promise<Result<{ success: true }, DomainError>> {
      try {
        const decisionNote = normalizeDecisionNote(note);
        if (!decisionNote) {
          return Err(
            domainError(
              "validation",
              "decision_note_required",
              "Decision note is required",
            ),
          );
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
              throwRollback(
                domainError(
                  "conflict",
                  "request_not_pending",
                  "Request is no longer pending",
                ),
              );
            }

            const updateResult =
              await transactionRepos.capacityRequests.markRejected(
                access.value.id,
                actor.userId,
                decisionNote,
              );
            if (!updateResult.numUpdatedRows) {
              throwRollback(
                domainError(
                  "conflict",
                  "request_not_pending",
                  "Request is no longer pending",
                ),
              );
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
