import { config } from "~/lib/config";
import type { createAuditService } from "~/server/shared/audit";
import type { PolicySource } from "~/server/shared/pipeline-types";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, isErr, type Result } from "~/server/shared/result";

import {
  type createLeadCandidateService,
  type LeadCandidateError,
} from "../engine-gateway/lead-candidate-service";
import {
  type createLeadAssignmentService,
  type LeadAssignmentError,
} from "./assignment-service";
import {
  availableLeadRefill,
  computeNeededAssignments,
  todayDateString,
} from "./domain";
import {
  type createLeadPolicyService,
  type EffectiveLeadPolicy,
} from "./policy-service";

export type LeadRefillError =
  | { reason: "user_not_found"; message: string }
  | { reason: "refill_exhausted"; message: string }
  | { reason: "validation"; message: string }
  | LeadCandidateError
  | LeadAssignmentError
  | { reason: "unexpected"; message: string };

export type LeadCapacitySnapshotError =
  | { reason: "user_not_found"; message: string }
  | { reason: "unexpected"; message: string };

export type LeadRefillGrantError =
  | { reason: "user_not_found"; message: string }
  | { reason: "validation"; message: string }
  | { reason: "unexpected"; message: string };

export type LeadCapacitySnapshot = {
  policySource: PolicySource;
  activeBufferTarget: number;
  activeAssignments: number;
  dailyRefillLimit: number;
  extraGranted: number;
  usedAmount: number;
  remaining: number;
};

interface LeadRefillServiceDeps {
  repos: Repositories;
  policyService: ReturnType<typeof createLeadPolicyService>;
  assignmentService: ReturnType<typeof createLeadAssignmentService>;
  candidateService: ReturnType<typeof createLeadCandidateService>;
  auditService: ReturnType<typeof createAuditService>;
}

export function createLeadRefillService(deps: LeadRefillServiceDeps) {
  const {
    repos,
    policyService,
    assignmentService,
    candidateService,
    auditService,
  } = deps;
  type LeadRefillLedger = NonNullable<
    Awaited<ReturnType<typeof repos.leadRefillLedger.findByUserAndDate>>
  >;

  async function logRefillRequestBestEffort(input: {
    userId: number;
    requested: number;
    assigned: number;
  }) {
    try {
      await auditService.log(
        input.userId,
        "lead_refill_requested",
        "user",
        input.userId,
        {
          requested: input.requested,
          assigned: input.assigned,
        },
      );
    } catch (error) {
      console.error("Failed to log lead refill request", error);
    }
  }

  async function compensateUsageBestEffort(input: {
    actorUserId: number;
    ledgerId: number;
    amount: number;
    reason: string;
  }) {
    try {
      await repos.leadRefillLedger.decrementUsage(input.ledgerId, input.amount);
    } catch (error) {
      try {
        await auditService.log(
          input.actorUserId,
          "lead_refill_compensation_failed",
          "user",
          input.actorUserId,
          {
            amount: input.amount,
            reason: input.reason,
            message:
              error instanceof Error
                ? error.message
                : "Unknown decrement failure",
          },
        );
      } catch (auditError) {
        console.error(
          "Failed to log lead refill compensation failure",
          auditError,
        );
      }
    }
  }

  async function ensureLedger(userId: number): Promise<
    Result<
      {
        ledger: LeadRefillLedger;
        policy: EffectiveLeadPolicy;
      },
      LeadRefillError
    >
  > {
    const policyResult = await policyService.getEffectiveLeadPolicy(userId);
    if (isErr(policyResult)) {
      if (policyResult.error.reason === "user_not_found") {
        return Err({
          reason: "user_not_found",
          message: policyResult.error.message,
        });
      }
      return Err({ reason: "unexpected", message: policyResult.error.message });
    }

    try {
      const policy = policyResult.value;
      const today = todayDateString();
      let ledger = await repos.leadRefillLedger.findByUserAndDate(
        userId,
        today,
      );
      if (!ledger) {
        await repos.leadRefillLedger.create({
          user_id: userId,
          date: today,
          base_limit: policy.dailyRefillLimit,
        });
        ledger = await repos.leadRefillLedger.findByUserAndDate(userId, today);
      }
      if (!ledger) {
        return Err({
          reason: "unexpected",
          message: "Lead refill ledger was not created",
        });
      }
      if (ledger.base_limit !== policy.dailyRefillLimit) {
        await repos.leadRefillLedger.syncBaseLimit(
          ledger.id,
          policy.dailyRefillLimit,
        );
        ledger = await repos.leadRefillLedger.findByUserAndDate(userId, today);
      }
      if (!ledger) {
        return Err({
          reason: "unexpected",
          message: "Lead refill ledger was not reloaded",
        });
      }
      return Ok({ ledger, policy });
    } catch (error) {
      return Err({
        reason: "unexpected",
        message:
          error instanceof Error
            ? error.message
            : "Failed to ensure lead refill ledger",
      });
    }
  }

  return {
    ensureLedger,

    async getCurrentLeadCapacity(
      userId: number,
    ): Promise<Result<LeadCapacitySnapshot, LeadCapacitySnapshotError>> {
      const ledgerResult = await ensureLedger(userId);
      if (isErr(ledgerResult)) {
        if (ledgerResult.error.reason === "user_not_found") {
          return Err({
            reason: "user_not_found",
            message: ledgerResult.error.message,
          });
        }

        return Err({
          reason: "unexpected",
          message: ledgerResult.error.message,
        });
      }

      try {
        const { policy, ledger } = ledgerResult.value;
        const activeAssignments =
          await repos.leadAssignments.countActiveByUser(userId);
        return Ok({
          policySource: policy.source,
          activeBufferTarget: policy.activeBufferTarget,
          activeAssignments,
          dailyRefillLimit: ledger.base_limit,
          extraGranted: ledger.extra_granted,
          usedAmount: ledger.used_amount,
          remaining: availableLeadRefill({
            baseLimit: ledger.base_limit,
            extraGranted: ledger.extra_granted,
            usedAmount: ledger.used_amount,
          }),
        });
      } catch (error) {
        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get current lead capacity",
        });
      }
    },

    async refillQueueForExecutive(
      userId: number,
      branchId: number,
    ): Promise<
      Result<{ assigned: number; requested: number }, LeadRefillError>
    > {
      const ledgerResult = await ensureLedger(userId);
      if (isErr(ledgerResult)) {
        return Err(ledgerResult.error);
      }

      try {
        const { policy, ledger } = ledgerResult.value;
        const activeAssignments =
          await repos.leadAssignments.countActiveByUser(userId);
        const needed = computeNeededAssignments(
          activeAssignments,
          policy.activeBufferTarget,
        );
        if (needed === 0) {
          return Ok({ assigned: 0, requested: 0 });
        }

        let workingLedger = ledger;
        let allowed = 0;
        let reserved = false;

        for (let attempt = 0; attempt < 2; attempt += 1) {
          const remaining = availableLeadRefill({
            baseLimit: workingLedger.base_limit,
            extraGranted: workingLedger.extra_granted,
            usedAmount: workingLedger.used_amount,
          });
          allowed = Math.min(needed, remaining);
          if (allowed <= 0) break;

          reserved = await repos.leadRefillLedger.reserveUsageIfAvailable(
            workingLedger.id,
            allowed,
          );
          if (reserved) break;

          const reloaded = await repos.leadRefillLedger.findByUserAndDate(
            userId,
            todayDateString(),
          );
          if (!reloaded) {
            break;
          }
          workingLedger = reloaded;
        }

        if (!reserved || allowed <= 0) {
          return Err({
            reason: "refill_exhausted",
            message: "Daily lead refill exhausted. Request more lead capacity.",
          });
        }

        const candidateResult =
          await candidateService.requestCandidatesForExecutive({
            userId,
            branchId,
            amount: allowed,
            strategy: "balanced",
          });
        if (isErr(candidateResult)) {
          await compensateUsageBestEffort({
            actorUserId: userId,
            ledgerId: workingLedger.id,
            amount: allowed,
            reason: "candidate_fetch_failed",
          });
          return Err(candidateResult.error);
        }

        const assignmentResult =
          await assignmentService.assignCandidatesToExecutive(
            userId,
            candidateResult.value,
          );
        if (isErr(assignmentResult)) {
          await compensateUsageBestEffort({
            actorUserId: userId,
            ledgerId: workingLedger.id,
            amount: allowed,
            reason: "assignment_failed",
          });
          return Err(assignmentResult.error);
        }

        const unused = allowed - assignmentResult.value;
        if (unused > 0) {
          await compensateUsageBestEffort({
            actorUserId: userId,
            ledgerId: workingLedger.id,
            amount: unused,
            reason: "partial_assignment",
          });
        }

        await logRefillRequestBestEffort({
          userId,
          requested: allowed,
          assigned: assignmentResult.value,
        });
        return Ok({ assigned: assignmentResult.value, requested: allowed });
      } catch (error) {
        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Unexpected lead refill failure",
        });
      }
    },

    async grantExtraLeadRefill(
      actorUserId: number,
      targetUserId: number,
      amount: number,
      reason: string,
    ): Promise<Result<LeadCapacitySnapshot, LeadRefillGrantError>> {
      if (amount > config.capacityRequests.maxRequestAmount) {
        return Err({
          reason: "validation",
          message: "Grant exceeds configured maximum",
        });
      }

      const ledgerResult = await ensureLedger(targetUserId);
      if (isErr(ledgerResult)) {
        if (ledgerResult.error.reason === "user_not_found") {
          return Err({
            reason: "user_not_found",
            message: ledgerResult.error.message,
          });
        }

        return Err({
          reason: "unexpected",
          message: ledgerResult.error.message,
        });
      }

      try {
        const { ledger } = ledgerResult.value;
        await repos.leadRefillLedger.incrementExtra(ledger.id, amount);
        await auditService.log(
          actorUserId,
          "lead_refill_granted",
          "user",
          targetUserId,
          {
            amount,
            reason,
          },
        );
        return this.getCurrentLeadCapacity(targetUserId);
      } catch (error) {
        return Err({
          reason: "unexpected",
          message:
            error instanceof Error
              ? error.message
              : "Failed to grant extra lead refill",
        });
      }
    },
  };
}
