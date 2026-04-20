import type { APIEvent } from "@solidjs/start/server";

import { buildFileDownloadHeaders } from "~/server/files/headers";
import { executeDownload } from "~/server/files/service";
import { serverRuntime } from "~/server/runtime";
import { isErr } from "~/server/shared/result";

export async function GET(event: Pick<APIEvent, "params">): Promise<Response> {
  try {
    const token = event.params.token;
    if (!token || typeof token !== "string" || token.length < 16) {
      return new Response("Invalid token", { status: 400 });
    }

    const { repo, storage } = serverRuntime.files;
    const now = Date.now();

    const result = await executeDownload(token, { repo, storage }, now);

    if (isErr(result)) {
      const kind = result.error.kind;
      const status =
        kind === "not_found" ? 404 : kind === "conflict" ? 410 : 500;
      return new Response(result.error.message, { status });
    }

    const { fileAsset, bytes } = result.value;
    const headers = buildFileDownloadHeaders(
      fileAsset.detectedMime,
      fileAsset.safeDisplayFilename,
    );

    const body = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(body).set(bytes);

    return new Response(body, { status: 200, headers });
  } catch (err) {
    return new Response(
      err instanceof Error ? err.message : "Unexpected error",
      { status: 500 },
    );
  }
}
