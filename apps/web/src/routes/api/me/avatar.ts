import type { APIEvent } from "@solidjs/start/server";

import { requireSession } from "~/lib/auth/access/session";
import { profilePictureService } from "~/server/shared/context";

function mapAvatarErrorStatus(code: string): number {
  switch (code) {
    case "avatar_not_found":
    case "user_not_found":
      return 404;
    case "repository_unavailable":
    case "storage_unavailable":
      return 503;
    default:
      return 500;
  }
}

export async function GET(event: Pick<APIEvent, "request">): Promise<Response> {
  try {
    const session = await requireSession();
    const avatarResult = await profilePictureService.get(session.userId);

    if (!avatarResult.ok) {
      return new Response("Profile picture not found", {
        status: mapAvatarErrorStatus(avatarResult.error.code),
      });
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
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return new Response("Unauthorized", { status: 401 });
    }

    return new Response("Unexpected error", { status: 500 });
  }
}
