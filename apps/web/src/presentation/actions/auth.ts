"use server";

import { action, redirect } from "@solidjs/router";
import { UsersRepository } from "~/infrastructure/db/repositories/users";
import { verifyPassword } from "~/infrastructure/auth/password";
import { getAuthSession } from "~/infrastructure/auth/session";

export const loginAction = action(async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email y contraseña requeridos" };
  }

  const user = await UsersRepository.findByEmail(email);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return { error: "Credenciales inválidas" };
  }

  const session = await getAuthSession();
  await session.update({
    userId: user.id,
    role: user.role,
    branchId: user.branch_id,
  });

  throw redirect("/dashboard");
}, "login");

export async function getUserData() {
  const session = await getAuthSession();
  const userId = session.data.userId;

  if (!userId) {
    throw redirect("/login");
  }

  return await UsersRepository.findById(userId);
}

export async function logout() {
  const session = await getAuthSession();
  await session.clear();
  throw redirect("/login");
}
