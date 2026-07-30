import { query } from "@solidjs/router";

export const meQuery = query(async () => {
  "use server";

  const { getMe } = await import("~/actions/auth/session/index.action");
  return getMe();
}, "auth.me");
