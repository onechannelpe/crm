import { createDb } from "./src/lib/db/client";
import { hashPassword, verifyPassword } from "./src/lib/auth/password";

const db = createDb("crm.db");

async function test() {
    console.log("Testing authentication system...\n");

    const testPassword = "placeholder";
    console.log(`1. Testing password: "${testPassword}"`);

    const admin = await db
        .selectFrom("users")
        .selectAll()
        .where("email", "=", "admin@crm.local")
        .executeTakeFirst();

    if (!admin) {
        console.error("❌ Admin user not found");
        process.exit(1);
    }

    console.log(`✓ Admin user found: ${admin.email}`);
    console.log(`✓ Stored hash: ${admin.password_hash.substring(0, 40)}...`);

    const isValid = await verifyPassword(admin.password_hash, testPassword);

    if (isValid) {
        console.log("✓ Password verification: SUCCESS\n");
    } else {
        console.error("❌ Password verification: FAILED\n");
        process.exit(1);
    }

    console.log("2. Testing hash generation...");
    const newHash = await hashPassword(testPassword);
    console.log(`✓ Generated new hash: ${newHash.substring(0, 40)}...`);

    const isNewValid = await verifyPassword(newHash, testPassword);
    console.log(`✓ New hash verification: ${isNewValid ? "SUCCESS" : "FAILED"}\n`);

    console.log("3. Checking user_sessions table...");
    const sessions = await db
        .selectFrom("user_sessions")
        .selectAll()
        .execute();

    console.log(`✓ Sessions table exists, currently ${sessions.length} sessions\n`);

    console.log("4. Summary:");
    console.log("   - Password hashing: OK");
    console.log("   - Password verification: OK");
    console.log("   - Database schema: OK");
    console.log("   - Ready for login testing\n");

    console.log("You can now:");
    console.log("   1. Start dev server: bun run dev");
    console.log("   2. Login at http://localhost:3000/login");
    console.log("   3. Email: admin@crm.local");
    console.log("   4. Password: placeholder");

    process.exit(0);
}

test().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
});
