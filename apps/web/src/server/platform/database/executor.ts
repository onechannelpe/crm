import type { Kysely, Transaction } from "kysely";

import type { Database } from "~/server/platform/database/types";

export type DatabaseExecutor = Kysely<Database> | Transaction<Database>;
