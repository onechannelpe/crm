import type { APIEvent } from "@solidjs/start/server";

import { isRefreshExtensionSessionRequest } from "~/server/extension/contracts";
import { extensionService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

export async function POST(event: APIEvent): Promise<Response> {
  try {
    const body: unknown = await event.request.json();
    if (!isRefreshExtensionSessionRequest(body)) {
      return Response.json(
        { error: "Invalid extension session refresh request" },
        { status: 400 },
      );
    }

    const result = await extensionService.refreshInstallationSession(body);
    if (isErr(result)) {
      const status =
        result.error.reason === "installation_invalid"
          ? 400
          : result.error.reason === "session_invalid"
            ? 401
            : result.error.reason === "misconfigured"
              ? 503
              : 500;
      return Response.json({ error: result.error.message }, { status });
    }

    return Response.json(result.value, { status: 200 });
  } catch {
    return new Response("Unexpected error", { status: 500 });
  }
}
