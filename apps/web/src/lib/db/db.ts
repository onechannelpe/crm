import { createDb } from "./client";

const dbPath = process.env.WEB_DB_PATH ?? "crm.db";

export const db = createDb(dbPath);
