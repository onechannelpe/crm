import type {
  LeadCapacitySnapshot,
  LeadRefillResult,
} from "~/server/lead-operations/contracts";
import type {
  LeadCapacitySnapshotError,
  LeadRefillError,
  LeadRefillGrantError,
} from "~/server/lead-operations/errors";
import type { createAuditService } from "~/server/shared/audit";
import type { BranchId, UserId } from "~/server/shared/ids";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, isErr, type Result } from "~/server/shared/result";

import { type createLeadCandidateService } from "../engine-gateway/lead-candidate-service";
import { type createLeadAssignmentService } from "./assignment-service";
import {
  availableLeadRefill,
  computeNeededAssignments,
  todayDateString,
} from "./domain";
import {
  type createLeadPolicyService,
  type EffectiveLeadPolicy,
} from "./policy-service";

export type { LeadCapacitySnapshot } from "~/server/lead-operations/contracts";
export type {
  LeadCapacitySnapshotError,
  LeadRefillError,
  LeadRefillGrantError,
} from "~/server/lead-operations/errors";

interface LeadRefillServiceDeps {
  repos: Repositories;
  assignmentService: ReturnType<typeof createLeadAssignmentService>;
  candidateService: ReturnType<typeof createLeadCandidateService>;
  auditService: ReturnType<typeof createAuditService>;
  grantService: ReturnType<typeof createLeadRefillGrantService>;
}

interface LeadRefillGrantServiceDeps {
  repos: Repositories;
  policyService: ReturnType<typeof createLeadPolicyService>;
  auditService: ReturnType<typeof createAuditService>;
}

export function createLeadRefillGrantService(deps: LeadRefillGrantServiceDeps) {
  const { repos, policyService, auditService } = deps;

  type LeadRefillLedger = NonNullable<
    Awaited<ReturnType<typeof repos.leadRefillLedger.findByUserAndDate>>
  >;

  async function ensureLedger(userId: UserId): Promise<
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

  async function getCurrentLeadCapacity(
    userId: UserId,
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
  }

  async function grantExtraLeadRefill(
    actorUserId: UserId,
    targetUserId: UserId,
    amount: number,
    reason: string,
  ): Promise<Result<LeadCapacitySnapshot, LeadRefillGrantError>> {
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

      return getCurrentLeadCapacity(targetUserId);
    } catch (error) {
      return Err({
        reason: "unexpected",
        message:
          error instanceof Error
            ? error.message
            : "Failed to grant extra lead refill",
      });
    }
  }

  return {
    ensureLedger,
    getCurrentLeadCapacity,
    grantExtraLeadRefill,
  };
}

export function createLeadRefillService(deps: LeadRefillServiceDeps) {
  const {
    repos,
    assignmentService,
    candidateService,
    auditService,
    grantService,
  } = deps;

  type LeadRefillLedger = NonNullable<
    Awaited<ReturnType<typeof repos.leadRefillLedger.findByUserAndDate>>
  >;

  async function logRefillRequestBestEffort(input: {
    userId: UserId;
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
    } catch {
      // Keep audit failures from changing request outcomes.
    }
  }

  async function compensateUsage(input: {
    actorUserId: UserId;
    ledgerId: number;
    amount: number;
    reason: string;
  }): Promise<Result<void, LeadRefillError>> {
    try {
      const decremented =
        await repos.leadRefillLedger.decrementUsageIfAvailable(
          input.ledgerId,
          input.amount,
        );
      if (!decremented) {
        const message = "Insufficient usage to compensate lead refill";
        try {
          await auditService.log(
            input.actorUserId,
            "lead_refill_compensation_failed",
            "user",
            input.actorUserId,
            {
              amount: input.amount,
              reason: input.reason,
              message,
            },
          );
        } catch {
          // Preserve typed failure response when observability write fails.
        }
        return Err({
          reason: "compensation_failed",
          message: `Failed to compensate lead refill usage: ${message}`,
        });
      }
      return Ok(undefined);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown decrement failure";
      try {
        await auditService.log(
          input.actorUserId,
          "lead_refill_compensation_failed",
          "user",
          input.actorUserId,
          {
            amount: input.amount,
            reason: input.reason,
            message,
          },
        );
      } catch {
        // Preserve typed failure response when observability write fails.
      }
      return Err({
        reason: "compensation_failed",
        message: `Failed to compensate lead refill usage: ${message}`,
      });
    }
  }

  const { ensureLedger, getCurrentLeadCapacity, grantExtraLeadRefill } =
    grantService;

  async function reserveAllowedRefill(input: {
    userId: UserId;
    ledger: LeadRefillLedger;
    needed: number;
  }): Promise<
    Result<{ ledger: LeadRefillLedger; allowed: number }, LeadRefillError>
  > {
    let workingLedger = input.ledger;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const remaining = availableLeadRefill({
        baseLimit: workingLedger.base_limit,
        extraGranted: workingLedger.extra_granted,
        usedAmount: workingLedger.used_amount,
      });
      const allowed = Math.min(input.needed, remaining);
      if (allowed <= 0) {
        return Err({
          reason: "refill_exhausted",
          message: "Daily lead refill exhausted. Request more lead capacity.",
        });
      }

      const reserved = await repos.leadRefillLedger.reserveUsageIfAvailable(
        workingLedger.id,
        allowed,
      );
      if (reserved) {
        return Ok({ ledger: workingLedger, allowed });
      }

      const reloaded = await repos.leadRefillLedger.findByUserAndDate(
        input.userId,
        todayDateString(),
      );
      if (!reloaded) {
        break;
      }

      workingLedger = reloaded;
    }

    return Err({
      reason: "refill_exhausted",
      message: "Daily lead refill exhausted. Request more lead capacity.",
    });
  }

  return {
    ensureLedger,
    getCurrentLeadCapacity,

    async refillQueueForExecutive(
      userId: UserId,
      branchId: BranchId,
    ): Promise<Result<LeadRefillResult, LeadRefillError>> {
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

        const reservationResult = await reserveAllowedRefill({
          userId,
          ledger,
          needed,
        });
        if (isErr(reservationResult)) {
          return Err(reservationResult.error);
        }

        const { ledger: reservedLedger, allowed } = reservationResult.value;

        const candidateResult =
          await candidateService.requestCandidatesForExecutive({
            userId,
            branchId,
            amount: allowed,
            strategy: "balanced",
          });
        if (isErr(candidateResult)) {
          const compensationResult = await compensateUsage({
            actorUserId: userId,
            ledgerId: reservedLedger.id,
            amount: allowed,
            reason: "candidate_fetch_failed",
          });
          if (isErr(compensationResult)) {
            return Err(compensationResult.error);
          }
          return Err(candidateResult.error);
        }

        const assignmentResult =
          await assignmentService.assignCandidatesToExecutive(
            userId,
            candidateResult.value,
          );
        if (isErr(assignmentResult)) {
          const compensationResult = await compensateUsage({
            actorUserId: userId,
            ledgerId: reservedLedger.id,
            amount: allowed,
            reason: "assignment_failed",
          });
          if (isErr(compensationResult)) {
            return Err(compensationResult.error);
          }
          return Err(assignmentResult.error);
        }

        const unused = allowed - assignmentResult.value;
        if (unused > 0) {
          const compensationResult = await compensateUsage({
            actorUserId: userId,
            ledgerId: reservedLedger.id,
            amount: unused,
            reason: "partial_assignment",
          });
          if (isErr(compensationResult)) {
            return Err(compensationResult.error);
          }
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

    grantExtraLeadRefill,
  };
}
