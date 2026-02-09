import { Hono } from "hono";
import { requireRole } from "../auth/rbac";
import { db } from "../../db/client";
import { hashPassword } from "../auth/password";

const team = new Hono();

team.get("/users", requireRole(["supervisor", "admin"]), async (c) => {
	const users = await db
		.selectFrom("users")
		.select(["id", "full_name", "email", "role", "is_active"])
		.execute();
	return c.json(users);
});

team.post("/users", requireRole(["admin"]), async (c) => {
	const { email, password, fullName, role, branchId } = await c.req.json();

	const passwordHash = await hashPassword(password);

	await db
		.insertInto("users")
		.values({
			email,
			password_hash: passwordHash,
			full_name: fullName,
			role,
			branch_id: branchId,
			is_active: 1,
			created_at: Date.now(),
		})
		.execute();

	return c.json({ success: true });
});

export default team;
