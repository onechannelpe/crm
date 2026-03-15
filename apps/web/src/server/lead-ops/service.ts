import { createAuditService } from "~/server/shared/audit";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, isErr, type Result } from "~/server/shared/result";

import {
  createLeadAssignmentService,
  type LeadAssignmentError,
} from "./assignment-service";
import { availableLeadRefill, todayDateString } from "./domain";
import { createLeadPolicyService } from "./policy-service";

export type LeadOpsError =
  | { reason: "refill_exhausted"; message: string }
  | LeadAssignmentError
  | { reason: "unexpected"; message: string };

export function createLeadOpsService(repos: Repositories) {
  const policyService = createLeadPolicyService(repos);
  const assignmentService = createLeadAssignmentService(repos);
  const audit = createAuditService(repos);

  async function ensureLedger(userId: number) {
    const policy = await policyService.getEffectivePolicy(userId);
    const today = todayDateString();
    let ledger = await repos.leadRefillLedger.findByUserAndDate(userId, today);
    if (!ledger) {
      await repos.leadRefillLedger.create({
        user_id: userId,
        date: today,
        base_limit: policy.dailyRefillLimit,
      });
      ledger = await repos.leadRefillLedger.findByUserAndDate(userId, today);
    }
    if (!ledger) {
      throw new Error("Lead refill ledger was not created");
    }
    if (ledger.base_limit !== policy.dailyRefillLimit) {
      await repos.leadRefillLedger.syncBaseLimit(
        ledger.id,
        policy.dailyRefillLimit,
      );
      ledger = await repos.leadRefillLedger.findByUserAndDate(userId, today);
    }
    if (!ledger) {
      throw new Error("Lead refill ledger was not reloaded");
    }
    return { policy, ledger };
  }

  return {
    async getStatus(userId: number) {
      const { policy, ledger } = await ensureLedger(userId);
      const activeAssignments =
        await repos.leadAssignments.countActiveByUser(userId);
      return {
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
      };
    },

    async refillToTarget(
      userId: number,
      branchId: number,
    ): Promise<Result<{ assigned: number; requested: number }, LeadOpsError>> {
      try {
        const { policy, ledger } = await ensureLedger(userId);
        const activeAssignments =
          await repos.leadAssignments.countActiveByUser(userId);
        const needed = Math.max(
          0,
          policy.activeBufferTarget - activeAssignments,
        );
        if (needed === 0) {
          return Ok({ assigned: 0, requested: 0 });
        }
        const remaining = availableLeadRefill({
          baseLimit: ledger.base_limit,
          extraGranted: ledger.extra_granted,
          usedAmount: ledger.used_amount,
        });
        const allowed = Math.min(needed, remaining);
        if (allowed <= 0) {
          return Err({
            reason: "refill_exhausted",
            message: "Daily lead refill exhausted. Request more lead capacity.",
          });
        }
        await repos.leadRefillLedger.incrementUsage(ledger.id, allowed);
        const assignmentResult =
          await assignmentService.assignLeadsForExecutive(
            userId,
            branchId,
            allowed,
          );
        if (isErr(assignmentResult)) {
          await repos.leadRefillLedger.decrementUsage(ledger.id, allowed);
          return Err(assignmentResult.error);
        }
        const unused = allowed - assignmentResult.value;
        if (unused > 0) {
          await repos.leadRefillLedger.decrementUsage(ledger.id, unused);
        }
        await audit.log(userId, "lead_refill_requested", "user", userId, {
          requested: allowed,
          assigned: assignmentResult.value,
        });
        return Ok({ assigned: assignmentResult.value, requested: allowed });
      } catch {
        return Err({
          reason: "unexpected",
          message: "Unexpected lead refill failure",
        });
      }
    },

    async grantExtraRefill(
      actorUserId: number,
      targetUserId: number,
      amount: number,
      reason: string,
    ) {
      const { ledger } = await ensureLedger(targetUserId);
      await repos.leadRefillLedger.incrementExtra(ledger.id, amount);
      await audit.log(
        actorUserId,
        "lead_refill_granted",
        "user",
        targetUserId,
        {
          amount,
          reason,
        },
      );
      return this.getStatus(targetUserId);
    },
  };
}
