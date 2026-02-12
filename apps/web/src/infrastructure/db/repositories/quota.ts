import { db } from "../client";
import type { QuotaAllocation, NewQuotaAllocation } from "../schema";

export class QuotaRepository {
  static async getTodayQuota(
    userId: number,
    date: string,
  ): Promise<QuotaAllocation | null> {
    return await db
      .selectFrom("quota_allocations")
      .selectAll()
      .where("user_id", "=", userId)
      .where("date", "=", date)
      .executeTakeFirst() ?? null;
  }

  static async create(
    allocation: NewQuotaAllocation,
  ): Promise<number> {
    const result = await db
      .insertInto("quota_allocations")
      .values(allocation)
      .executeTakeFirstOrThrow();

    return Number(result.insertId);
  }

  static async incrementUsage(
    id: number,
    amount: number,
  ): Promise<void> {
    await db
      .updateTable("quota_allocations")
      .set((eb) => ({
        used_amount: eb("used_amount", "+", amount),
      }))
      .where("id", "=", id)
      .execute();
  }

  static async getUserAllocations(
    userId: number,
    limit: number = 30,
  ): Promise<QuotaAllocation[]> {
    return await db
      .selectFrom("quota_allocations")
      .selectAll()
      .where("user_id", "=", userId)
      .orderBy("date", "desc")
      .limit(limit)
      .execute();
  }
}
