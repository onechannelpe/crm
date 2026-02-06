import { query } from "@solidjs/router";
import { getRequestEvent } from "solid-js/web";
import { deleteCookie, setCookie } from "vinxi/http";
import { verifyPassword } from "~/lib/auth/password";
import {
  createSession,
  generateSessionToken,
  invalidateSession,
} from "~/lib/auth/session";
import { db } from "~/lib/db/client";

export const getUser = query(async () => {
  "use server";
  const event = getRequestEvent();
  return event?.locals.user || null;
}, "user");

export const login = async (formData: FormData) => {
  "use server";
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const event = getRequestEvent();

  const user = db.query("SELECT * FROM user WHERE email = ?").get(email) as any;
  if (!user) throw new Error("Credenciales inválidas");

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) throw new Error("Credenciales inválidas");

  const token = generateSessionToken();
  const session = createSession(token, user.id);

  setCookie(event!.nativeEvent, "session", token, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  return { success: true };
};

export const logout = async () => {
  "use server";
  const event = getRequestEvent();
  if (event?.locals.session) {
    invalidateSession(event.locals.session.id);
  }
  deleteCookie(event!.nativeEvent, "session");
  return { success: true };
};
