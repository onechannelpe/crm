import type { Kysely } from "kysely";

import { hashPassword } from "~/server/auth/password/password";

import type { Database } from "../../../types";
import { resolveInstallationPassword } from "../../shared/installation-password";
import { persistInstallationManifest } from "../manifest";
import { persistBranchesAndPolicies } from "./branches-policies";

export async function persistInstallation(
  db: Kysely<Database>,
  seededAt: Date,
): Promise<void> {
  const realPassword = resolveInstallationPassword();
  const realPasswordHash = await hashPassword(realPassword);

  await persistBranchesAndPolicies(db, seededAt);
  await persistInstallationManifest(db, seededAt, realPasswordHash);
}
