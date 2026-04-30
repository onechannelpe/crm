import type { Kysely } from "kysely";

import { hashPassword } from "~/lib/auth/password/password";

import type { Database } from "../../../types";
import type { CompiledBaseDataScenario } from "../compiler";
import { persistAuditActionPolicies } from "./audit-policies";
import { persistBranchesAndPolicies } from "./branches-policies";
import { persistUsersAndTeams } from "./users-teams";
import { persistWorkflowKinds } from "./workflow-kinds";

export async function persistBaseData(
  db: Kysely<Database>,
  compiled: CompiledBaseDataScenario,
): Promise<void> {
  const now = compiled.generatedAtMs;
  const realPassword = resolveBootstrapPassword();
  const realPasswordHash = await hashPassword(realPassword);

  await persistBranchesAndPolicies(db, now);
  await persistUsersAndTeams(db, now, realPasswordHash);
  await persistWorkflowKinds(db);
  await persistAuditActionPolicies(db, now);
}

function resolveBootstrapPassword(): string {
  const envPassword = process.env.SEED_PASSWORD?.trim();
  if (envPassword && envPassword.length > 0) {
    return envPassword;
  }
  throw new Error("missing_seed_password");
}
