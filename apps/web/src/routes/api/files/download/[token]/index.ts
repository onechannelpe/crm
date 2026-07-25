import type { APIEvent } from "@solidjs/start/server";

import { buildFileDownloadHeaders } from "~/server/files/headers";
import { executeDownload } from "~/server/files/service/execute-download";
import { toWire } from "~/server/platform/action/domain-error";
import { getServerRuntime } from "~/server/platform/container";
import { isErr } from "~/shared/result";

export async function GET(
  event: Pick<APIEvent, "params" | "request">,
): Promise<Response> {
  try {
    const token = event.params.token;
    if (!token || typeof token !== "string" || token.length < 16) {
      return new Response("Invalid token", { status: 400 });
    }

    const { repo, storage } = getServerRuntime().files;
    const now = new Date();

    const result = await executeDownload(token, { repo, storage }, now);

    if (isErr(result)) {
      const kind = result.error.kind;
      const status =
        kind === "not_found" ? 404 : kind === "conflict" ? 410 : 500;
      return new Response(toWire(result.error).message, { status });
    }

    const { fileAsset, body } = result.value;
    const requestUrl = new URL(event.request.url);
    const isInline = requestUrl.searchParams.get("inline") === "1";
    const headers = buildFileDownloadHeaders(
      fileAsset.detectedMime,
      fileAsset.safeDisplayFilename,
      { disposition: isInline ? "inline" : "attachment" },
    );

    return new Response(body, { status: 200, headers });
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : "Unexpected error",
      { status: 500 },
    );
  }
}
