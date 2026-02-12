import { db } from "./client";

async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });
}

export async function seed() {
  const now = Date.now();

  console.log("Seeding branches...");
  await db.insertInto("branches").values([
    { name: "Lima Centro", created_at: now },
    { name: "Callao", created_at: now },
  ]).execute();

  console.log("Seeding users...");
  await db.insertInto("users").values([
    {
      branch_id: 1,
      team_id: null,
      email: "admin@crm.pe",
      password_hash: await hashPassword("admin123"),
      full_name: "Admin User",
      role: "admin",
      is_active: true,
      created_at: now,
    },
    {
      branch_id: 1,
      team_id: null,
      email: "exec@crm.pe",
      password_hash: await hashPassword("exec123"),
      full_name: "Executive User",
      role: "executive",
      is_active: true,
      created_at: now,
    },
    {
      branch_id: 1,
      team_id: null,
      email: "backoffice@crm.pe",
      password_hash: await hashPassword("back123"),
      full_name: "BackOffice User",
      role: "back_office",
      is_active: true,
      created_at: now,
    },
    {
      branch_id: 1,
      team_id: null,
      email: "supervisor@crm.pe",
      password_hash: await hashPassword("super123"),
      full_name: "Supervisor User",
      role: "supervisor",
      is_active: true,
      created_at: now,
    },
  ]).execute();

  console.log("Seeding products...");
  await db.insertInto("products").values([
    { name: "Duo Play 100MB", category: "Fijo", subtype: "Duo", price: 89.90, is_active: true },
    { name: "Trio Max 300MB", category: "Fijo", subtype: "Trio", price: 129.90, is_active: true },
    { name: "Postpago 50GB", category: "Movil", subtype: null, price: 59.90, is_active: true },
    { name: "Postpago 100GB", category: "Movil", subtype: null, price: 89.90, is_active: true },
  ]).execute();

  console.log("✓ Seed completed");
}

if (import.meta.main) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
