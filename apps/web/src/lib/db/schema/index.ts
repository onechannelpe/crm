import type { Kysely } from "kysely";

export interface SchemaModule {
  createTables(db: Kysely<any>): Promise<void>;
}

export interface SeedModule {
  run(db: Kysely<any>): Promise<void>;
}

import * as seed00 from "../seeds/00-audit-policies";
import * as s00 from "./00-core";
import * as s01 from "./01-users-auth";
import * as s02 from "./02-crm";
import * as s03 from "./03-notifications";
import * as s04 from "./04-products-sales";
import * as s05 from "./05-observability";
import * as s06 from "./06-extensions";
import * as s07 from "./07-platform";

export const SCHEMA_MODULES: SchemaModule[] = [
  s00,
  s01,
  s02,
  s03,
  s04,
  s05,
  s06,
  s07,
];

export const SEED_MODULES: SeedModule[] = [seed00];
