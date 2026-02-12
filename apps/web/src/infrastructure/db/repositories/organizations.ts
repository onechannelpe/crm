import { db } from "../client";
import type { Organization, NewOrganization } from "../schema";

export class OrganizationsRepository {
  static async findByRuc(ruc: string): Promise<Organization | null> {
    return await db
      .selectFrom("organizations")
      .selectAll()
      .where("ruc", "=", ruc)
      .executeTakeFirst() ?? null;
  }

  static async create(org: NewOrganization): Promise<number> {
    const result = await db
      .insertInto("organizations")
      .values(org)
      .executeTakeFirstOrThrow();

    return Number(result.insertId);
  }

  static async lockToBranch(
    id: number,
    branchId: number,
    userId: number,
  ): Promise<void> {
    await db
      .updateTable("organizations")
      .set({
        locked_branch_id: branchId,
        locked_at: Date.now(),
        locked_by_user_id: userId,
      })
      .where("id", "=", id)
      .execute();
  }

  static async findOrCreate(
    ruc: string,
    name: string,
  ): Promise<Organization> {
    const existing = await this.findByRuc(ruc);
    if (existing) return existing;

    const id = await this.create({
      ruc,
      name,
      locked_branch_id: null,
      locked_at: null,
      locked_by_user_id: null,
      created_at: Date.now(),
    });

    return (await db
      .selectFrom("organizations")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirstOrThrow())!;
  }
}
