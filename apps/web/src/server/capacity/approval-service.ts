import type { SessionData } from "~/lib/auth/access/session";
import { createLeadCandidateService } from "~/server/engine-gateway/lead-candidate-service";
import { createLeadAssignmentService } from "~/server/lead-operations/assignment-service";
import { createLeadPolicyService } from "~/server/lead-operations/policy-service";
import {
  createLeadRefillService,
  type LeadCapacitySnapshot,
  type LeadRefillGrantError,
} from "~/server/lead-operations/refill-service";
import {
  createSearchAllowanceService,
  type SearchAllowanceGrantError,
  type SearchAllowanceSnapshot,
} from "~/server/search-access/allowance-service";
import { createSearchPolicyService } from "~/server/search-access/policy-service";
import { createAuditService } from "~/server/shared/audit";
import {
  createRepositories,
  type Repositories,
} from "~/server/shared/registry";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive } from "./scope";

type TransactionRunner = <T>(
  operation: (
    transactionRepos: ReturnType<typeof createRepositories>,
  ) => Promise<T>,
) => Promise<T>;

export type CapacityApprovalError =
  | { reason: "not_found"; message: string }
  | { reason: "forbidden"; message: string }
  | { reason: "conflict"; message: string }
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

interface CapacityApprovalServiceDeps {
  repos: Repositories;
  runInRepositoryTransaction: TransactionRunner;
}

interface CapacityApprovalExecutorDeps {
  repos: Repositories;
  grantExtraSearchAllowance: (
    actorUserId: number,
    targetUserId: number,
    amount: number,
    reason: string,
  ) => Promise<Result<SearchAllowanceSnapshot, SearchAllowanceGrantError>>;
  grantExtraLeadRefill: (
    actorUserId: number,
    targetUserId: number,
    amount: number,
    reason: string,
  ) => Promise<Result<LeadCapacitySnapshot, LeadRefillGrantError>>;
}

type CapacityApprovalExecutorError =
  | { reason: "request_not_found"; message: string }
  | { reason: "request_not_pending"; message: string }
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

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

function mapExecutorError(
  error: CapacityApprovalExecutorError,
): CapacityApprovalError {
  if (
    error.reason === "request_not_found" ||
    error.reason === "request_not_pending"
  ) {
    return { reason: "conflict", message: error.message };
  }
  if (error.reason === "validation") {
    return { reason: "validation", message: error.message };
  }

  return { reason: "unexpected", message: error.message };
}

function createCapacityApprovalExecutor(deps: CapacityApprovalExecutorDeps) {
  return {
    async approveCapacityRequest(
      actorUserId: number,
      requestId: number,
      note: string | null,
    ): Promise<Result<{ success: true }, CapacityApprovalExecutorError>> {
      const request = await deps.repos.capacityRequests.findById(requestId);
      if (!request) {
        return Err({
          reason: "request_not_found",
          message: "Request not found",
        });
      }
      if (request.status !== "pending") {
        return Err({
          reason: "request_not_pending",
          message: "Request is no longer pending",
        });
      }

      const statusUpdate = await deps.repos.capacityRequests.markApproved(
        request.id,
        actorUserId,
        note,
      );
      if (!statusUpdate.numUpdatedRows) {
        return Err({
          reason: "unexpected",
          message: "Request approval did not update any rows",
        });
      }

      if (request.kind === "search_extra") {
        const grantResult = await deps.grantExtraSearchAllowance(
          actorUserId,
          request.user_id,
          request.requested_amount,
          note ?? request.reason,
        );
        if (isErr(grantResult)) {
          if (grantResult.error.reason === "validation") {
            return Err({
              reason: "validation",
              message: grantResult.error.message,
            });
          }
          return Err({
            reason: "unexpected",
            message: grantResult.error.message,
          });
        }
      } else {
        const grantResult = await deps.grantExtraLeadRefill(
          actorUserId,
          request.user_id,
          request.requested_amount,
          note ?? request.reason,
        );
        if (isErr(grantResult)) {
          if (grantResult.error.reason === "validation") {
            return Err({
              reason: "validation",
              message: grantResult.error.message,
            });
          }
          return Err({
            reason: "unexpected",
            message: grantResult.error.message,
          });
        }
      }

      return Ok({ success: true as const });
    },

    async rejectCapacityRequest(
      actorUserId: number,
      requestId: number,
      note: string,
    ): Promise<Result<{ success: true }, CapacityApprovalExecutorError>> {
      const request = await deps.repos.capacityRequests.findById(requestId);
      if (!request) {
        return Err({
          reason: "request_not_found",
          message: "Request not found",
        });
      }
      if (request.status !== "pending") {
        return Err({
          reason: "request_not_pending",
          message: "Request is no longer pending",
        });
      }

      const statusUpdate = await deps.repos.capacityRequests.markRejected(
        request.id,
        actorUserId,
        note,
      );
      if (!statusUpdate.numUpdatedRows) {
        return Err({
          reason: "unexpected",
          message: "Request rejection did not update any rows",
        });
      }

      return Ok({ success: true as const });
    },
  };
}

function createTransactionalApprovalExecutor(
  transactionRepos: ReturnType<typeof createRepositories>,
) {
  const txAuditService = createAuditService(transactionRepos);
  const txSearchPolicyService = createSearchPolicyService(transactionRepos);
  const txLeadPolicyService = createLeadPolicyService(transactionRepos);
  const txLeadAssignmentService = createLeadAssignmentService(transactionRepos);
  const txLeadCandidateService = createLeadCandidateService();
  const txSearchAllowanceService = createSearchAllowanceService({
    repos: transactionRepos,
    policyService: txSearchPolicyService,
    auditService: txAuditService,
  });
  const txLeadRefillService = createLeadRefillService({
    repos: transactionRepos,
    policyService: txLeadPolicyService,
    assignmentService: txLeadAssignmentService,
    candidateService: txLeadCandidateService,
    auditService: txAuditService,
  });

  return createCapacityApprovalExecutor({
    repos: transactionRepos,
    grantExtraSearchAllowance:
      txSearchAllowanceService.grantExtraSearchAllowance,
    grantExtraLeadRefill: txLeadRefillService.grantExtraLeadRefill,
  });
}

function throwRollback(error: CapacityApprovalError): never {
  throw new TransactionRollbackError(error);
}

export function createCapacityApprovalService(
  deps: CapacityApprovalServiceDeps,
) {
  async function assertApprovalAccess(
    actor: SessionData,
    requestId: number,
    deniedMessage: string,
  ): Promise<Result<CapacityRequestRecord, CapacityApprovalError>> {
    const request = await deps.repos.capacityRequests.findById(requestId);
    if (!request) {
      return Err({ reason: "not_found", message: "Request not found" });
    }

    const managed = await canManageExecutive(
      actor,
      request.user_id,
      deps.repos,
    );
    if (!managed.ok) {
      return Err({
        reason: "forbidden",
        message: deniedMessage,
      });
    }

    return Ok(request);
  }

  return {
    async approveCapacityRequest(
      actor: SessionData,
      requestId: number,
      note?: string,
    ): Promise<Result<{ success: true }, CapacityApprovalError>> {
      try {
        const accessResult = await assertApprovalAccess(
          actor,
          requestId,
          "Cannot approve this request",
        );
        if (isErr(accessResult)) {
          return Err(accessResult.error);
        }
        const request = accessResult.value;

        const result = await deps.runInRepositoryTransaction(
          async (transactionRepos) => {
            const executor =
              createTransactionalApprovalExecutor(transactionRepos);
            const approvalResult = await executor.approveCapacityRequest(
              actor.userId,
              request.id,
              note?.trim() || null,
            );
            if (isErr(approvalResult)) {
              throwRollback(mapExecutorError(approvalResult.error));
            }
            return approvalResult.value;
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
      requestId: number,
      note: string,
    ): Promise<Result<{ success: true }, CapacityApprovalError>> {
      try {
        const accessResult = await assertApprovalAccess(
          actor,
          requestId,
          "Cannot reject this request",
        );
        if (isErr(accessResult)) {
          return Err(accessResult.error);
        }
        const request = accessResult.value;

        const result = await deps.runInRepositoryTransaction(
          async (transactionRepos) => {
            const executor =
              createTransactionalApprovalExecutor(transactionRepos);
            const rejectionResult = await executor.rejectCapacityRequest(
              actor.userId,
              request.id,
              note,
            );
            if (isErr(rejectionResult)) {
              throwRollback(mapExecutorError(rejectionResult.error));
            }
            return rejectionResult.value;
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
