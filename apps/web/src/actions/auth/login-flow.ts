"use server";

import { getLoginFlow as getLoginFlowService } from "~/server/auth/application/session";

export async function getLoginFlow(flowId: number) {
  return getLoginFlowService(flowId);
}
