import type { Kysely } from "kysely";

export interface SchemaModule {
  createTables(db: Kysely<any>): Promise<void>;
}

export interface SeedModule {
  run(db: Kysely<any>): Promise<void>;
}

import * as seed00 from "../seeds/00-audit-policies";
import * as s00 from "./00-core";
import * as s01 from "./01-auth";
import * as s02 from "./02-crm";
import * as s03 from "./03-capacity";
import * as s04 from "./04-sales";
import * as s05 from "./05-notifications";
import * as s06 from "./06-extensions";
import * as s07 from "./07-search";
import * as s08 from "./08-platform";
import * as s09 from "./09-observability";
import * as s10 from "./10-workflow";
import * as s11 from "./11-integration-pipeline";

export const SCHEMA_MODULES: SchemaModule[] = [
  s00,
  s01,
  s02,
  s03,
  s04,
  s05,
  s06,
  s07,
  s08,
  s09,
  s10,
  s11,
];

export const SEED_MODULES: SeedModule[] = [seed00];
