import { createDb } from "./client";

export const dbUrl =
  process.env.WEB_DB_URL ?? "postgres://postgres@localhost:5432/crm";

export const db = createDb(dbUrl);
