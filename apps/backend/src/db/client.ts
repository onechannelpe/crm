import { Kysely } from "kysely";
import { BunSqliteDialect } from "kysely-bun-worker/normal";
import type { Database } from "./schema";

export const db = new Kysely<Database>({
  dialect: new BunSqliteDialect({
    url: "core.db",
    dbOptions: { strict: true, create: true },
  }),
});
