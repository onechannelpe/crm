"use server";

import { useSession as vinxiSession } from "vinxi/http";
import { redirect } from "@solidjs/router";
import type { User } from "~/server/db/schema";
import { isPasskeyRequired } from "~/lib/server/passkey-utils";

export const SESSION_MAX_AGE = 60 * 60 * 24 * 30 * 1000; // 30 days in milliseconds

export interface SessionData {
  userId: number;
  role: User["role"];
  passkeyVerified: boolean;
  createdAt: number;
}

export async function getAuthSession() {
  return await vinxiSession<SessionData>({
    password: process.env.SESSION_SECRET!,
    name: "session",
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: Math.floor(SESSION_MAX_AGE / 1000),
      path: "/",
    },
  });
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getAuthSession();

  if (!session.data.userId) {
    throw redirect("/login");
  }

  return session.data as SessionData;
}

export async function requireRole(
  allowedRoles: User["role"][],
): Promise<SessionData> {
  const sessionData = await requireAuth();

  if (!allowedRoles.includes(sessionData.role)) {
    throw redirect("/");
  }

  return sessionData;
}

export async function requirePasskey(): Promise<SessionData> {
  const sessionData = await requireAuth();

  if (isPasskeyRequired(sessionData.role) && !sessionData.passkeyVerified) {
    throw redirect("/auth/passkey-verify");
  }

  return sessionData;
}
