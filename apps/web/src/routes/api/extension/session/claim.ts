import type { APIEvent } from "@solidjs/start/server";

import { isClaimExtensionSessionRequest } from "~/server/extension/contracts";
import { getServerRuntime } from "~/server/platform/container";
import { toWire } from "~/server/shared/domain-error";
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
      await getServerRuntime().extension.extensionService.claimInstallationSession(
        body,
      );
    if (isErr(result)) {
      const status =
        result.error.code === "installation_invalid"
          ? 400
          : result.error.code === "handoff_invalid"
            ? 401
            : result.error.code === "handoff_claimed_by_other_installation"
              ? 409
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
