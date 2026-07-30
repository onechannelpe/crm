import { query } from "@solidjs/router";

export const loginFlowQuery = query(async () => {
  "use server";

  const { getLoginFlow } = await import("~/actions/auth/session/index.action");
  return getLoginFlow();
}, "auth.login-flow");
