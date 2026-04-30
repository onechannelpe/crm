import type { Kysely } from "kysely";

import * as auditActionPoliciesSeed from "../seeds/bootstrap/audit-action-policies";
import { SCHEMA_MODULES } from "./plan";

export interface SchemaModule {
  createTables(db: Kysely<any>): Promise<void>;
}

export interface SeedModule {
  run(db: Kysely<any>): Promise<void>;
}

export { SCHEMA_MODULES };

export const BOOTSTRAP_SEED_MODULES: SeedModule[] = [auditActionPoliciesSeed];
