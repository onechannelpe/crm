import { db } from "./client";
import { hashPassword } from "../auth/password";

export async function seedIfEmpty() {
    const userCount = await db
        .selectFrom("users")
        .select(db.fn.countAll().as('count'))
        .executeTakeFirst();
    
    if (userCount && Number(userCount.count) > 0) {
        console.log("Database already seeded, skipping...");
        return;
    }

    console.log("Seeding database with initial data...");
    const now = Date.now();

    // Use INSERT OR IGNORE for idempotent seeding
    await db
        .insertInto("branches")
        .values([
            { name: "Lima Centro", created_at: now },
            { name: "Lima Norte", created_at: now },
        ])
        .onConflict((oc) => oc.doNothing())
        .execute();

    const passwordHash = await hashPassword("placeholder");

    await db
        .insertInto("users")
        .values([
            { branch_id: 1, email: "admin@crm.local", password_hash: passwordHash, full_name: "Admin User", role: "admin", is_active: 1, created_at: now },
            { branch_id: 1, email: "supervisor@crm.local", password_hash: passwordHash, full_name: "Supervisor User", role: "supervisor", is_active: 1, created_at: now },
            { branch_id: 1, email: "exec@crm.local", password_hash: passwordHash, full_name: "Executive User", role: "executive", is_active: 1, created_at: now },
            { branch_id: 1, email: "backoffice@crm.local", password_hash: passwordHash, full_name: "Back-Office User", role: "back_office", is_active: 1, created_at: now },
        ])
        .onConflict((oc) => oc.doNothing())
        .execute();

    await db
        .insertInto("teams")
        .values([
            { branch_id: 1, name: "Team Alpha", supervisor_id: 2, created_at: now },
        ])
        .onConflict((oc) => oc.doNothing())
        .execute();

    await db
        .updateTable("users")
        .set({ team_id: 1 })
        .where("id", "=", 3)
        .execute();

    await db
        .insertInto("products")
        .values([
            { name: "Plan Movil 50GB", category: "mobile", subtype: "mono", price: 69.90, is_active: 1 },
            { name: "Fibra 200Mbps", category: "fiber", subtype: "mono", price: 89.90, is_active: 1 },
            { name: "Duo Fibra + Movil", category: "bundle", subtype: "duo", price: 129.90, is_active: 1 },
        ])
        .onConflict((oc) => oc.doNothing())
        .execute();

    const today = new Date().toISOString().split("T")[0];
    await db
        .insertInto("quota_allocations")
        .values({
            user_id: 3,
            allocated_by_user_id: 2,
            date: today,
            quota_amount: 50,
            used_amount: 0,
            created_at: now,
        })
        .onConflict((oc) => oc.doNothing())
        .execute();

    console.log("Database seeding complete.");
}

async function seed() {
    try {
        await seedIfEmpty();
        process.exit(0);
    } catch (err) {
        console.error("Seed failed:", err);
        process.exit(1);
    }
}

if (import.meta.main) {
    seed();
}
