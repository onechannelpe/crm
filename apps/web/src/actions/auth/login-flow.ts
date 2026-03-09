"use server";

import { getLoginFlowState } from "~/lib/auth/login-flow";
import { repos } from "~/server/shared/context";

export async function getLoginFlow(flowId: number) {
  return getLoginFlowState(flowId, repos);
}
