import { db } from "~/server/db/client";

export async function getUserPasskeyCount(userId: number): Promise<number> {
  const result = await db
    .selectFrom("passkeys")
    .select((eb) => eb.fn.count<number>("id").as("count"))
    .where("user_id", "=", userId)
    .executeTakeFirst();

  if (!result?.count) return 0;

  return typeof result.count === "number"
    ? result.count
    : Number.parseInt(String(result.count), 10);
}

export function isPasskeyRequired(role: string): boolean {
  return ["admin", "sales_manager"].includes(role);
}
