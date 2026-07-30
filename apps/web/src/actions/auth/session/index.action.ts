type Composition = typeof import("~/server/auth/ui/session");

export async function getLoginFlow(
  ...args: Parameters<Composition["getLoginFlow"]>
) {
  "use server";
  const { getLoginFlow: execute } = await import("~/server/auth/ui/session");
  return execute(...args);
}

export async function logout(...args: Parameters<Composition["logout"]>) {
  "use server";
  const { logout: execute } = await import("~/server/auth/ui/session");
  return execute(...args);
}

export async function getMe(...args: Parameters<Composition["getMe"]>) {
  "use server";
  const { getMe: execute } = await import("~/server/auth/ui/session");
  return execute(...args);
}
