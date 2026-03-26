import type { Kysely, Transaction } from "kysely";

import type { Database } from "~/lib/db/types";

export type DatabaseExecutor = Kysely<Database> | Transaction<Database>;
