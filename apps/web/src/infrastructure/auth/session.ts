import { useSession as vinxiSession } from "vinxi/http";
import { redirect } from "@solidjs/router";
import { config } from "~/shared/config";
import { env } from "~/shared/env";
import type { User } from "~/infrastructure/db/schema";

export interface SessionData {
  userId: number;
  role: User["role"];
  branchId: number;
  passkeyVerified: boolean;
  createdAt: number;
}

export async function getAuthSession() {
  return await vinxiSession<SessionData>({
    password: env.sessionSecret,
    name: "session",
    cookie: {
      httpOnly: true,
      secure: env.nodeEnv === "production",
      sameSite: "lax",
      maxAge: config.session.maxAgeSeconds,
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
    throw redirect("/dashboard");
  }

  return sessionData;
}
