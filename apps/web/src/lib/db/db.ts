import { createDb } from "./client";

const dbUrl = process.env.WEB_DB_URL ?? "http://127.0.0.1:8080";

export const db = createDb(dbUrl);
