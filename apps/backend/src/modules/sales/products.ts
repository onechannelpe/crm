import { db } from "../../db/client";

export async function getActiveProducts() {
  return await db
    .selectFrom("products")
    .where("is_active", "=", 1)
    .selectAll()
    .execute();
}
