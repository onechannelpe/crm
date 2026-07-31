import { query } from "@solidjs/router";

import { getMe } from "~/server/auth/ui/session";

export const meQuery = query(async () => {
  "use server";
  return getMe();
}, "auth.me");
