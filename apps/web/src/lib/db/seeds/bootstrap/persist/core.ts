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
  const realPasswordHash = await hashPassword("infinitypay");

  await persistBranchesAndPolicies(db, now);
  await persistUsersAndTeams(db, now, realPasswordHash);
  await persistWorkflowKinds(db);
  await persistAuditActionPolicies(db, now);
}
