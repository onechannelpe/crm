"use server";

import { getLoginFlow as getLoginFlowService } from "~/server/auth/service-session";

export async function getLoginFlow(flowId: number) {
  return getLoginFlowService(flowId);
}
