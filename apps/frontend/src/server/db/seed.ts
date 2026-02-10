import { hashPassword } from "../auth/password";
import { db } from "./client";

export async function seed() {
  try {
    const existingUsers = await db.selectFrom("users").selectAll().execute();
    if (existingUsers.length > 0) {
      console.log("Database already seeded");
      return;
    }
  } catch (error) {
    console.log("Proceeding with seed...");
  }

  try {
    console.log("Seeding users...");
    await db
      .insertInto("users")
      .values([
        {
          email: "miguel.gomez@onechannel.pe",
          password_hash: await hashPassword("admin123"),
          full_name: "Miguel Gómez",
          role: "admin",
          branch_id: 1,
          is_active: 1,
          created_at: Date.now(),
        },
        {
          email: "luis.diaz@onechannel.pe",
          password_hash: await hashPassword("exec123"),
          full_name: "Luis Diaz",
          role: "executive",
          branch_id: 1,
          is_active: 1,
          created_at: Date.now(),
        },
        {
          email: "maria.valverde@onechannel.pe",
          password_hash: await hashPassword("back123"),
          full_name: "Maria Valverde",
          role: "back_office",
          branch_id: 1,
          is_active: 1,
          created_at: Date.now(),
        },
      ])
      .execute();

    console.log("Seeding products...");
    await db
      .insertInto("products")
      .values([
        {
          name: "Duo Play",
          category: "Fijo",
          subtype: "Duo",
          price: 89.9,
          is_active: 1,
        },
        {
          name: "Trio Max",
          category: "Fijo",
          subtype: "Trio",
          price: 129.9,
          is_active: 1,
        },
        {
          name: "Postpago 50GB",
          category: "Movil",
          subtype: null,
          price: 59.9,
          is_active: 1,
        },
      ])
      .execute();

    console.log("Database seeded successfully");
  } catch (error) {
    console.error("Seed failed:", error);
    throw error;
  }
}

if (import.meta.main) {
  seed().catch(console.error);
}
