import { Kysely } from "kysely";
import { BunWorkerDialect } from "kysely-bun-worker";
import type { Database } from "./schema";

export const db = new Kysely<Database>({
	dialect: new BunWorkerDialect({
		url: "core.db",
		cacheStatment: true,
		worker: new Worker(new URL("./worker.ts", import.meta.url).href, {
			type: "module",
		}),
		dbOptions: { strict: true, create: true },
	}),
});
