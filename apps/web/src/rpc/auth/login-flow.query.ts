import { query } from "@solidjs/router";

import { getLoginFlow } from "~/server/auth/ui/session";

export const loginFlowQuery = query(async (flowId: string) => {
  "use server";
  return getLoginFlow(flowId);
}, "auth.login-flow");
