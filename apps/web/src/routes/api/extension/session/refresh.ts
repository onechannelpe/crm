import { isRefreshExtensionSessionRequest } from "~/server/extension/contracts";
import { composeExtension } from "~/server/extension/ui/composition";
import { toWire } from "~/server/platform/action/domain-error";
import { getRequestInstant } from "~/server/platform/http/request-context";
import { isErr } from "~/shared/result";

import type { ApiRequestEvent } from "../../request-event";
import { readJsonBody } from "../json-body";

export async function POST(event: ApiRequestEvent): Promise<Response> {
  try {
    const parsed = await readJsonBody(event.request);
    if (!parsed.ok) {
      return parsed.response;
    }
    const body = parsed.body;
    if (!isRefreshExtensionSessionRequest(body)) {
      return Response.json(
        { error: "Invalid extension session refresh request" },
        { status: 400 },
      );
    }

    const result =
      await composeExtension().extensionService.refreshInstallationSession(
        body,
        getRequestInstant(),
      );
    if (isErr(result)) {
      const status =
        result.error.code === "installation_invalid"
          ? 400
          : result.error.code === "extension_session_invalid"
            ? 401
            : result.error.code === "misconfigured"
              ? 503
              : 500;
      return Response.json({ error: toWire(result.error).message }, { status });
    }

    return Response.json(result.value, { status: 200 });
  } catch {
    return new Response("Unexpected error", { status: 500 });
  }
}
