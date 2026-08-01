import { isExtensionRuntimeEventEnvelope } from "~/server/extension/contracts";
import { composeExtension } from "~/server/extension/ui/composition";
import { toWire } from "~/server/platform/action/domain-error";
import { getRequestInstant } from "~/server/platform/http/request-context";
import { isErr } from "~/shared/result";

import type { ApiRequestEvent } from "../request-event";
import { readJsonBody } from "./json-body";

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token === "" ? null : token;
}

export async function POST(event: ApiRequestEvent): Promise<Response> {
  try {
    const sessionToken = getBearerToken(event.request);
    if (!sessionToken) {
      return new Response("Unauthorized", { status: 401 });
    }

    const parsed = await readJsonBody(event.request);
    if (!parsed.ok) {
      return parsed.response;
    }
    const body = parsed.body;
    if (!isExtensionRuntimeEventEnvelope(body)) {
      return Response.json(
        { error: "Invalid extension event payload" },
        { status: 400 },
      );
    }

    const result = await composeExtension().extensionService.ingestRuntimeEvent(
      {
        sessionToken,
        event: body,
      },
      getRequestInstant(),
    );
    if (isErr(result)) {
      const status =
        result.error.code === "extension_session_invalid"
          ? 401
          : result.error.code === "misconfigured"
            ? 503
            : 500;
      return Response.json({ error: toWire(result.error).message }, { status });
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch {
    return new Response("Unexpected error", { status: 500 });
  }
}
