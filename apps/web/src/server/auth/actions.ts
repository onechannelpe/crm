"use server";

import { action, redirect } from "@solidjs/router";
import { db } from "~/server/db/client";
import { getAuthSession } from "./session";
import { verifyPassword } from "./password";
import { countUserPasskeys } from "./passkey";
import { consumeRateLimit, passwordThrottler } from "./rate-limit";
import { isPasskeyRequired } from "~/lib/server/passkey-utils";

export const loginAction = action(async (formData: FormData) => {
  "use server";

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password required" };
  }

  if (!consumeRateLimit(`login:${email}`)) {
    return { error: "Too many requests" };
  }

  if (!passwordThrottler.consume(email)) {
    return { error: "Too many failed attempts" };
  }

  const user = await db
    .selectFrom("users")
    .where("email", "=", email)
    .where("is_active", "=", 1)
    .selectAll()
    .executeTakeFirst();

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: "Invalid credentials" };
  }

  passwordThrottler.reset(email);

  const passkeyRequired = isPasskeyRequired(user.role);
  const passkeyCount = await countUserPasskeys(user.id);

  const session = await getAuthSession();
  await session.update({
    userId: user.id,
    role: user.role,
    passkeyVerified: false,
    createdAt: Date.now(),
  });

  if (passkeyRequired && passkeyCount === 0) {
    throw redirect("/auth/passkey-enroll");
  }

  if (passkeyRequired) {
    throw redirect("/auth/passkey-verify");
  }

  throw redirect("/search");
}, "login");

export const logoutAction = action(async () => {
  "use server";

  const session = await getAuthSession();
  await session.clear();

  throw redirect("/login");
}, "logout");

export const getMeAction = action(async () => {
  "use server";

  const session = await getAuthSession();

  if (!session.data.userId) {
    throw redirect("/login");
  }

  const user = await db
    .selectFrom("users")
    .select(["id", "email", "full_name", "role"])
    .where("id", "=", session.data.userId)
    .executeTakeFirst();

  return user;
}, "getMe");
