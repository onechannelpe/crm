import type { CurrentUserView } from "~/contracts/auth";
import { AuthLoginFlowId } from "~/domain/ids";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  getRequestContext,
  getRequestOperation,
} from "~/server/platform/http/request-context-storage";
import { isErr } from "~/shared/result";

export async function getLoginFlow(flowId: string) {
  const parsedFlowId = AuthLoginFlowId.parse(flowId);
  if (isErr(parsedFlowId)) {
    return null;
  }

  return getApplication().auth.login.getFlow(
    parsedFlowId.value,
    getRequestContext().publicOrigin,
    getRequestOperation(),
  );
}

export async function getMe(): Promise<CurrentUserView | null> {
  return executeSessionServerFunction({
    name: "auth.session.get_me",
    access: { kind: "session" },
    execute: (ctx) => getApplication().auth.sessions.currentUser(ctx),
  });
}
