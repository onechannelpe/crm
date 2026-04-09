import type { APIEvent } from "@solidjs/start/server";

import { isClaimExtensionSessionRequest } from "~/server/extension/contracts";
import { serverRuntime } from "~/server/runtime";
import { isErr } from "~/server/shared/result";

import { readJsonBody } from "../json-body";

export async function POST(event: APIEvent): Promise<Response> {
  try {
    const parsed = await readJsonBody(event.request);
    if (!parsed.ok) {
      return parsed.response;
    }
    const body = parsed.body;
    if (!isClaimExtensionSessionRequest(body)) {
      return Response.json(
        { error: "Invalid extension session claim request" },
        { status: 400 },
      );
    }

    const result =
      await serverRuntime.extension.extensionService.claimInstallationSession(
        body,
      );
    if (isErr(result)) {
      const status =
        result.error.reason === "installation_invalid"
          ? 400
          : result.error.reason === "handoff_invalid"
            ? 401
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
