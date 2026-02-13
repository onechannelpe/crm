import { createClient } from "@libsql/client";
import { Kysely } from "kysely";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import type { Database as DatabaseSchema } from "./schema";

export function createDb(path: string): Kysely<DatabaseSchema> {
    const client = createClient({
        url: `file:${path}`,
        intMode: "number",
    });

    client.execute("PRAGMA journal_mode = WAL");
    client.execute("PRAGMA synchronous = NORMAL");
    client.execute("PRAGMA busy_timeout = 5000");
    client.execute("PRAGMA foreign_keys = ON");
    client.execute("PRAGMA cache_size = -32000");

    return new Kysely<DatabaseSchema>({
        dialect: new LibsqlDialect({ client }),
    });
}

export const db = createDb("crm.db");
