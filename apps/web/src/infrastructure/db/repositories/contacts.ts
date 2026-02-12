import { db } from "../client";
import type { Contact, NewContact } from "../schema";

export class ContactsRepository {
  static async getById(id: number): Promise<Contact | null> {
    return await db
      .selectFrom("contacts")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst() ?? null;
  }

  static async findByDni(dni: string): Promise<Contact | null> {
    return await db
      .selectFrom("contacts")
      .selectAll()
      .where("dni", "=", dni)
      .executeTakeFirst() ?? null;
  }

  static async create(contact: NewContact): Promise<number> {
    const result = await db
      .insertInto("contacts")
      .values(contact)
      .executeTakeFirstOrThrow();

    return Number(result.insertId);
  }

  static async updateCooldown(
    id: number,
    userId: number,
    cooldownUntil: number,
  ): Promise<void> {
    await db
      .updateTable("contacts")
      .set({
        last_contacted_at: Date.now(),
        last_contacted_by_user_id: userId,
        cooldown_until: cooldownUntil,
      })
      .where("id", "=", id)
      .execute();
  }

  static async findOrCreate(
    organizationId: number,
    dni: string,
    name: string,
    phonePrimary: string | null,
  ): Promise<Contact> {
    const existing = await this.findByDni(dni);
    if (existing) return existing;

    const id = await this.create({
      organization_id: organizationId,
      dni,
      name,
      phone_primary: phonePrimary,
      phone_secondary: null,
      last_contacted_at: null,
      last_contacted_by_user_id: null,
      cooldown_until: null,
      created_at: Date.now(),
    });

    return (await this.getById(id))!;
  }
}
