import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import { validateSessionToken } from "../modules/auth/session";

export async function authMiddleware(c: Context, next: Next) {
	const token = getCookie(c, "session");

	if (!token) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	const { session, user } = await validateSessionToken(token);

	if (!session || !user) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	c.set("sessionId", session.id);
	c.set("userId", user.id);
	c.set("userRole", user.role);
	c.set("user", user);

	await next();
}
