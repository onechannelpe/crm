import type { Kysely } from "kysely";

import type { Database } from "../types";
import { SCHEMA_MODULES } from "./plan";
import * as auditActionPolicies from "./reference-data/audit-action-policies";
import * as workflowKinds from "./reference-data/workflow-kinds";

export interface SchemaModule {
  createTables(db: Kysely<Database>): Promise<void>;
  ensureBaseline?(db: Kysely<Database>): Promise<void>;
}

export interface ReferenceDataModule {
  run(db: Kysely<any>): Promise<void>;
}

export { SCHEMA_MODULES };

export const REFERENCE_DATA_MODULES: ReferenceDataModule[] = [
  auditActionPolicies,
  workflowKinds,
];
