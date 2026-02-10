import { Hono } from "hono";
import type { Context } from "hono";
import { db } from "../../db/client";
import { authMiddleware } from "../../middleware/auth";
import type { AppVariables } from "../../types";
import { deleteSessionTokenCookie, setSessionTokenCookie } from "./cookies";
import {
  buildAuthenticationOptions,
  buildRegistrationOptions,
  countUserPasskeys,
  isPasskeyRequired,
  verifyAuthentication,
  verifyRegistration,
} from "./passkeys";
import { verifyPassword } from "./password";
import {
  consumeRateLimit,
  passkeyThrottler,
  passwordThrottler,
} from "./rate-limit";
import {
  createSession,
  generateSessionToken,
  invalidateSession,
} from "./session";

const auth = new Hono<{ Variables: AppVariables }>();

function getClientKey(c: Context): string {
  return (
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for") ??
    c.req.header("x-real-ip") ??
    "unknown"
  );
}

auth.use("/logout", authMiddleware);
auth.use("/me", authMiddleware);
auth.use("/passkey/options", authMiddleware);
auth.use("/passkey/verify", authMiddleware);

auth.post("/login", async (c) => {
  const { email, password } = await c.req.json();
  if (!email || !password) return c.json({ error: "Invalid request" }, 400);

  const clientKey = getClientKey(c);

  if (!consumeRateLimit(`login:${clientKey}`)) {
    return c.json({ error: "Too many requests" }, 429);
  }

  if (!passwordThrottler.consume(email)) {
    return c.json({ error: "Too many requests" }, 429);
  }

  const user = await db
    .selectFrom("users")
    .where("email", "=", email)
    .where("is_active", "=", 1)
    .selectAll()
    .executeTakeFirst();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  passwordThrottler.reset(email);

  const passkeyCount = await countUserPasskeys(user.id);
  const passkeyRequired = isPasskeyRequired(user.role);

  const token = generateSessionToken();
  await createSession(token, user.id);

  setSessionTokenCookie(c, token);

  const response = {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
    passkey_required: passkeyRequired,
    passkey_enrolled: passkeyCount > 0,
    passkey_prompt: passkeyRequired && passkeyCount === 0,
  };

  return c.json(response);
});

auth.post("/logout", async (c) => {
  const sessionId = c.get("sessionId");
  if (sessionId) await invalidateSession(sessionId);

  deleteSessionTokenCookie(c);
  return c.json({ success: true });
});

auth.get("/me", async (c) => {
  const user = c.get("user");
  return c.json(user);
});

auth.post("/passkey/options", async (c) => {
  const userId = c.get("userId");
  const { password } = await c.req.json();
  const clientKey = getClientKey(c);

  if (!consumeRateLimit(`passkey-register:${userId}:${clientKey}`)) {
    return c.json({ error: "Too many requests" }, 429);
  }

  if (!password) return c.json({ error: "Password required" }, 400);

  const user = await db
    .selectFrom("users")
    .where("id", "=", userId)
    .where("is_active", "=", 1)
    .select(["id", "email", "password_hash"])
    .executeTakeFirst();

  if (!user) return c.json({ error: "Unauthorized" }, 401);
  if (!(await verifyPassword(password, user.password_hash))) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const options = await buildRegistrationOptions(user.id, user.email);
  return c.json(options);
});

auth.post("/passkey/verify", async (c) => {
  const userId = c.get("userId");
  const { response } = await c.req.json();
  const clientKey = getClientKey(c);

  if (!consumeRateLimit(`passkey-register-verify:${userId}:${clientKey}`)) {
    return c.json({ error: "Too many requests" }, 429);
  }

  if (!response) return c.json({ error: "Invalid request" }, 400);

  const verified = await verifyRegistration(userId, response);
  if (!verified) return c.json({ error: "Passkey registration failed" }, 400);

  return c.json({ success: true });
});

auth.post("/passkey/login/options", async (c) => {
  const { email } = await c.req.json();
  if (!email) return c.json({ error: "Email required" }, 400);

  const clientKey = getClientKey(c);

  if (!consumeRateLimit(`passkey-login-options:${clientKey}`)) {
    return c.json({ error: "Too many requests" }, 429);
  }

  const user = await db
    .selectFrom("users")
    .where("email", "=", email)
    .where("is_active", "=", 1)
    .select(["id"])
    .executeTakeFirst();

  if (!user) return c.json({ error: "Invalid credentials" }, 401);

  const passkeyCount = await countUserPasskeys(user.id);
  if (passkeyCount === 0) {
    return c.json({ error: "No passkeys enrolled" }, 400);
  }

  const options = await buildAuthenticationOptions(user.id);
  return c.json(options);
});

auth.post("/passkey/login/verify", async (c) => {
  const { email, response } = await c.req.json();
  if (!email || !response) return c.json({ error: "Invalid request" }, 400);

  const clientKey = getClientKey(c);

  if (!consumeRateLimit(`passkey-login-verify:${clientKey}`)) {
    return c.json({ error: "Too many requests" }, 429);
  }

  if (!passkeyThrottler.consume(email)) {
    return c.json({ error: "Too many requests" }, 429);
  }

  const user = await db
    .selectFrom("users")
    .where("email", "=", email)
    .where("is_active", "=", 1)
    .selectAll()
    .executeTakeFirst();

  if (!user) return c.json({ error: "Invalid credentials" }, 401);

  const result = await verifyAuthentication(user.id, response);
  if (!result.verified) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  passkeyThrottler.reset(email);

  const token = generateSessionToken();
  await createSession(token, user.id);
  setSessionTokenCookie(c, token);

  const passkeyCount = await countUserPasskeys(user.id);
  const passkeyRequired = isPasskeyRequired(user.role);

  return c.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
    },
    passkey_required: passkeyRequired,
    passkey_enrolled: passkeyCount > 0,
    passkey_prompt: passkeyRequired && passkeyCount === 0,
  });
});

export default auth;
