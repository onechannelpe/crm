import type { SessionData } from "~/lib/auth/access/session";
import { normalizeDecisionNote } from "~/server/capacity/domain";
import type { CapacityApprovalError } from "~/server/capacity/errors";
import { createLeadCandidateService } from "~/server/engine-gateway/lead-candidate-service";
import { createLeadAssignmentService } from "~/server/lead-operations/assignment-service";
import { createLeadPolicyService } from "~/server/lead-operations/policy-service";
import { createLeadRefillService } from "~/server/lead-operations/refill-service";
import { createSearchAllowanceService } from "~/server/search-access/allowance-service";
import { createSearchPolicyService } from "~/server/search-access/policy-service";
import { createAuditService } from "~/server/shared/audit";
import {
  createRepositories,
  type Repositories,
} from "~/server/shared/registry";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import type { RepositoryTransactionRunner } from "~/server/shared/transaction";

import { canManageExecutive } from "./scope";

export type { CapacityApprovalError } from "~/server/capacity/errors";

interface CapacityApprovalServiceDeps {
  repos: Repositories;
  runInRepositoryTransaction: RepositoryTransactionRunner;
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

function createGrantServices(
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

  return {
    searchAllowanceService: txSearchAllowanceService,
    leadRefillService: txLeadRefillService,
  };
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
      return Err({ reason: "forbidden", message: deniedMessage });
    }

    return Ok(request);
  }

  async function approveInTransaction(input: {
    actorUserId: number;
    requestId: number;
    note: string | null;
    transactionRepos: ReturnType<typeof createRepositories>;
  }): Promise<Result<{ success: true }, CapacityApprovalError>> {
    const request = await input.transactionRepos.capacityRequests.findById(
      input.requestId,
    );
    if (!request) {
      return Err({ reason: "conflict", message: "Request not found" });
    }
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
          request.user_id,
          request.requested_amount,
          input.note ?? request.reason,
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

      return Ok({ success: true as const });
    }

    const grantResult = await grants.leadRefillService.grantExtraLeadRefill(
      input.actorUserId,
      request.user_id,
      request.requested_amount,
      input.note ?? request.reason,
    );
    if (isErr(grantResult)) {
      if (grantResult.error.reason === "validation") {
        return Err({
          reason: "validation",
          message: grantResult.error.message,
        });
      }
      return Err({ reason: "unexpected", message: grantResult.error.message });
    }

    return Ok({ success: true as const });
  }

  return {
    async approveCapacityRequest(
      actor: SessionData,
      requestId: number,
      note?: string,
    ): Promise<Result<{ success: true }, CapacityApprovalError>> {
      try {
        const access = await assertApprovalAccess(
          actor,
          requestId,
          "Cannot approve this request",
        );
        if (isErr(access)) {
          return Err(access.error);
        }

        const result = await deps.runInRepositoryTransaction(
          async (transactionRepos) => {
            const approval = await approveInTransaction({
              actorUserId: actor.userId,
              requestId: access.value.id,
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
      requestId: number,
      note: string,
    ): Promise<Result<{ success: true }, CapacityApprovalError>> {
      try {
        const access = await assertApprovalAccess(
          actor,
          requestId,
          "Cannot reject this request",
        );
        if (isErr(access)) {
          return Err(access.error);
        }

        const decisionNote = normalizeDecisionNote(note);
        if (!decisionNote) {
          return Err({
            reason: "validation",
            message: "Decision note is required",
          });
        }

        const result = await deps.runInRepositoryTransaction(
          async (transactionRepos) => {
            const request = await transactionRepos.capacityRequests.findById(
              access.value.id,
            );
            if (!request || request.status !== "pending") {
              throwRollback({
                reason: "conflict",
                message: "Request is no longer pending",
              });
            }

            const updateResult =
              await transactionRepos.capacityRequests.markRejected(
                request.id,
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
