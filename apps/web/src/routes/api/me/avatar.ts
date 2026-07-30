import type { APIEvent } from "@solidjs/start/server";

import { getSession } from "~/server/platform/action/session";
import { getAvatarRuntime } from "~/server/platform/container/avatar-runtime";
import type { AvatarDomainErrorCode } from "~/server/users/avatar-service";

interface AvatarErrorResponse {
  status: number;
  body: string;
}

function mapAvatarErrorResponse(
  code: AvatarDomainErrorCode,
): AvatarErrorResponse {
  switch (code) {
    case "avatar_not_found":
      return { status: 404, body: "Profile picture not found" };
    case "user_not_found":
      return { status: 404, body: "User not found" };
    case "repository_unavailable":
    case "storage_unavailable":
      return { status: 503, body: "Profile picture service unavailable" };
    case "invalid_file":
    case "too_large":
    case "unsupported_mime":
      return { status: 400, body: "Invalid profile picture request" };
  }

  const exhaustiveCheck: never = code;
  return exhaustiveCheck satisfies never;
}

export async function GET(event: Pick<APIEvent, "request">): Promise<Response> {
  try {
    const { avatarService } = getAvatarRuntime();
    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    const avatarResult = await avatarService.get(session.userId);

    if (!avatarResult.ok) {
      const errorResponse = mapAvatarErrorResponse(avatarResult.error.code);
      return new Response(errorResponse.body, { status: errorResponse.status });
    }

    const avatar = avatarResult.value;
    const etag = `"avatar-${session.userId}-v${avatar.version}"`;

    if (event.request.headers.get("if-none-match") === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          etag,
          "cache-control": "private, no-cache",
        },
      });
    }

    const bodyBuffer = new ArrayBuffer(avatar.bytes.byteLength);
    new Uint8Array(bodyBuffer).set(avatar.bytes);

    return new Response(bodyBuffer, {
      status: 200,
      headers: {
        "content-type": avatar.mimeType,
        "cache-control": "private, no-cache",
        etag,
      },
    });
  } catch {
    return new Response("Unexpected error", { status: 500 });
  }
}
