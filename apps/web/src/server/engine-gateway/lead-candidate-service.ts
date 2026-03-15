import { engineClient } from "~/server/shared/engine";
import type { EngineClient } from "~/server/shared/engine/client";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { LeadCandidate } from "./types";

export type LeadCandidateError =
  | { reason: "engine_unavailable"; message: string }
  | { reason: "unexpected"; message: string };

export function createLeadCandidateService(
  repos: Repositories,
  engine: EngineClient = engineClient,
) {
  return {
    async requestCandidatesForExecutive(input: {
      userId: number;
      branchId: number;
      amount: number;
    }): Promise<Result<LeadCandidate[], LeadCandidateError>> {
      try {
        const healthy = await engine.health();
        if (!healthy) {
          return Err({
            reason: "engine_unavailable",
            message:
              "Lead engine unavailable. Verify engine service and dataset.",
          });
        }

        const organizations =
          await repos.organizations.findUnlockedOrLockedToBranch(
            input.branchId,
            input.amount * 2,
          );
        const candidates: LeadCandidate[] = [];

        for (const organization of organizations) {
          if (candidates.length >= input.amount) break;
          const response = await engine.search("ruc", organization.ruc, 10);
          for (const result of response.results) {
            if (candidates.length >= input.amount) break;
            candidates.push({
              organizationId: organization.id,
              organizationName: organization.name,
              ruc: organization.ruc,
              dni: result.person.dni,
              name: result.person.name ?? result.person.dni,
              phonePrimary: result.phones.primary,
              requiresBranchLock: organization.locked_branch_id === null,
            });
          }
        }

        return Ok(candidates);
      } catch {
        return Err({
          reason: "unexpected",
          message: "Failed to request lead candidates",
        });
      }
    },
  };
}
