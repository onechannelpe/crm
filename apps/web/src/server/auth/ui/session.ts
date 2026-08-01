import "server-only";
import type { CurrentUserView } from "~/contracts/auth";
import { AuthLoginFlowId } from "~/domain/ids";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";
import {
  getRequestContext,
  getRequestInstant,
} from "~/server/platform/http/request-context";
import { isErr } from "~/shared/result";

export async function getLoginFlow(flowId: string) {
  const parsedFlowId = AuthLoginFlowId.parse(flowId);
  if (isErr(parsedFlowId)) return null;

  return application.auth.login.getFlow(
    parsedFlowId.value,
    getRequestContext().publicOrigin,
    getRequestInstant(),
  );
}

export async function getMe(): Promise<CurrentUserView | null> {
  return executeSessionServerFunction({
    name: "auth.session.get_me",
    access: { kind: "session" },
    execute: (ctx) => application.auth.sessions.currentUser(ctx),
  });
}
