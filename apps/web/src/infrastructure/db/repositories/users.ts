import { db } from "../client";
import type { User } from "../schema";

export class UsersRepository {
  static async getById(id: number): Promise<User | null> {
    return await db
      .selectFrom("users")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst() ?? null;
  }

  static async findByEmail(email: string): Promise<User | null> {
    return await db
      .selectFrom("users")
      .selectAll()
      .where("email", "=", email)
      .where("is_active", "=", true)
      .executeTakeFirst() ?? null;
  }

  static async getAll(): Promise<User[]> {
    return await db
      .selectFrom("users")
      .selectAll()
      .where("is_active", "=", true)
      .orderBy("full_name", "asc")
      .execute();
  }

  static async getByBranch(branchId: number): Promise<User[]> {
    return await db
      .selectFrom("users")
      .selectAll()
      .where("branch_id", "=", branchId)
      .where("is_active", "=", true)
      .orderBy("full_name", "asc")
      .execute();
  }

  static async getByTeam(teamId: number): Promise<User[]> {
    return await db
      .selectFrom("users")
      .selectAll()
      .where("team_id", "=", teamId)
      .where("is_active", "=", true)
      .orderBy("full_name", "asc")
      .execute();
  }
}
