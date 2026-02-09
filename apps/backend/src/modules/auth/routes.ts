import { Hono } from "hono";
import { deleteCookie, setCookie } from "hono/cookie";
import { db } from "../../db/client";
import { verifyPassword } from "./password";
import {
	createSession,
	generateSessionToken,
	invalidateSession,
} from "./session";

const auth = new Hono();

auth.post("/login", async (c) => {
	const { email, password } = await c.req.json();

	const user = await db
		.selectFrom("users")
		.where("email", "=", email)
		.where("is_active", "=", 1)
		.selectAll()
		.executeTakeFirst();

	if (!user || !(await verifyPassword(password, user.password_hash))) {
		return c.json({ error: "Invalid credentials" }, 401);
	}

	const token = generateSessionToken();
	await createSession(token, user.id);

	setCookie(c, "session", token, {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "Lax",
		maxAge: 60 * 60 * 24 * 30,
		path: "/",
	});

	return c.json({ success: true });
});

auth.post("/logout", async (c) => {
	const sessionId = c.get("sessionId");
	if (sessionId) await invalidateSession(sessionId);

	deleteCookie(c, "session");
	return c.json({ success: true });
});

auth.get("/me", async (c) => {
	const user = c.get("user");
	return c.json(user);
});

export default auth;
