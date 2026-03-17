import { getEffectiveLeadPolicy } from "~/server/capacity-policy/lead-policy";
import type {
  LeadPolicyDefaultsRepo,
  LeadPolicyOverridesRepo,
} from "~/server/capacity-policy/repos";
import {
  cancelLeadUsage,
  commitLeadUsage,
  reserveLeadUsage,
} from "~/server/capacity-usage/lead-usage";
import type {
  LeadCapacityGrantsRepo,
  LeadUsageCommitsRepo,
  LeadUsageReservationsRepo,
} from "~/server/capacity-usage/repos";
import { createAssignment } from "~/server/leads/domain-assignment";
import { canContactNow } from "~/server/leads/domain-cooldown";
import { type DomainError } from "~/server/shared/domain-error";
import { engineClient } from "~/server/shared/engine";
import type { EngineClient } from "~/server/shared/engine/client";
import type { BranchId, UserId } from "~/server/shared/ids";
import { isErr, Ok, type Result } from "~/server/shared/result";

import { computeNeededAssignments } from "./domain";
import { requestCandidates } from "./gateway";

export interface RequestLeadRefillCommand {
  actorUserId: UserId;
  branchId: BranchId;
}

export interface LeadRefillResult {
  requested: number;
  assigned: number;
}

interface RefillRepos {
  users: {
    findById(
      id: UserId,
    ): Promise<{ team_id: number | null; branch_id: number } | undefined>;
  };
  leadPolicyDefaults: LeadPolicyDefaultsRepo;
  leadPolicyOverrides: LeadPolicyOverridesRepo;
  leadCapacityGrants: LeadCapacityGrantsRepo;
  leadUsageReservations: LeadUsageReservationsRepo;
  leadUsageCommits: LeadUsageCommitsRepo;
  leadAssignments: { countActiveByUser(userId: number): Promise<number> };
  organizations: {
    findOrCreate(ruc: string, name: string): Promise<{ id: number }>;
  };
  contacts: {
    findOrCreate(
      organizationId: number,
      dni: string,
      name: string,
      phone: string,
    ): Promise<{ id: number; cooldown_until: number | null }>;
  };
}

export interface RefillTxRepos {
  organizations: {
    findOrCreate(ruc: string, name: string): Promise<{ id: number }>;
  };
  contacts: {
    findOrCreate(
      organizationId: number,
      dni: string,
      name: string,
      phone: string,
    ): Promise<{ id: number; cooldown_until: number | null }>;
  };
  leadAssignments: {
    createMany(
      assignments: ReturnType<typeof createAssignment>[],
    ): Promise<void>;
  };
}

export type RefillTransactionRunner = <T>(
  operation: (repos: RefillTxRepos) => Promise<T>,
) => Promise<T>;

interface RefillDeps {
  repos: RefillRepos;
  runInTransaction: RefillTransactionRunner;
  engine?: Pick<EngineClient, "leadCandidates">;
}

export async function requestLeadRefill(
  command: RequestLeadRefillCommand,
  deps: RefillDeps,
): Promise<Result<LeadRefillResult, DomainError>> {
  const { repos, runInTransaction, engine = engineClient } = deps;

  const policyResult = await getEffectiveLeadPolicy(command.actorUserId, repos);
  if (isErr(policyResult)) return policyResult;

  const activeAssignments = await repos.leadAssignments.countActiveByUser(
    command.actorUserId,
  );
  const needed = computeNeededAssignments(
    activeAssignments,
    policyResult.value.bufferTarget,
  );

  if (needed === 0) return Ok({ requested: 0, assigned: 0 });

  const reservationResult = await reserveLeadUsage(
    { actorUserId: command.actorUserId, amount: needed, reason: "lead_refill" },
    repos,
  );
  if (isErr(reservationResult)) return reservationResult;

  const reservationId = reservationResult.value;

  const candidatesResult = await requestCandidates(
    { userId: command.actorUserId, branchId: command.branchId, amount: needed },
    engine,
  );
  if (isErr(candidatesResult)) {
    await cancelLeadUsage({ reservationId, reason: "external_failure" }, repos);
    return candidatesResult;
  }

  const assigned = await runInTransaction(async (txRepos) => {
    const uniqueRucs = [...new Set(candidatesResult.value.map((c) => c.ruc))];
    const orgEntries = await Promise.all(
      uniqueRucs.map(async (ruc) => {
        const candidate = candidatesResult.value.find((c) => c.ruc === ruc)!;
        const org = await txRepos.organizations.findOrCreate(
          ruc,
          candidate.organization_name,
        );
        return [ruc, org] as const;
      }),
    );
    const orgsByRuc = new Map(orgEntries);

    const uniqueContactKeys = [
      ...new Map(
        candidatesResult.value.map((c) => {
          const org = orgsByRuc.get(c.ruc)!;
          const key = `${org.id}:${c.dni}:${c.phone_primary}`;
          return [key, { org, candidate: c }] as const;
        }),
      ).entries(),
    ];
    const contactEntries = await Promise.all(
      uniqueContactKeys.map(async ([key, { org, candidate }]) => {
        const contact = await txRepos.contacts.findOrCreate(
          org.id,
          candidate.dni,
          candidate.person_name,
          candidate.phone_primary,
        );
        return [key, contact] as const;
      }),
    );
    const contactsByKey = new Map<
      string,
      { id: number; cooldown_until: number | null }
    >(contactEntries);

    const assignments = [];
    for (const candidate of candidatesResult.value) {
      const org = orgsByRuc.get(candidate.ruc)!;
      const key = `${org.id}:${candidate.dni}:${candidate.phone_primary}`;
      const contact = contactsByKey.get(key)!;
      if (!canContactNow(contact)) continue;
      assignments.push(createAssignment(command.actorUserId, contact.id));
    }

    if (assignments.length > 0) {
      await txRepos.leadAssignments.createMany(assignments);
    }
    return assignments.length;
  });

  const unused = needed - assigned;
  await commitLeadUsage({ reservationId, amount: assigned }, repos);
  if (unused > 0) {
    await cancelLeadUsage({ reservationId, reason: "partial_use" }, repos);
  }

  return Ok({ requested: needed, assigned });
}
