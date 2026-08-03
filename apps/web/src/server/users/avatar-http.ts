import type { AuthSession } from "~/domain/auth/access/session-types";
import type {
  AvatarDomainErrorCode,
  AvatarService,
} from "~/server/users/avatar-service";

type AvatarErrorResponse = {
  status: number;
  body: string;
};

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

  const exhaustiveCode: never = code;
  return exhaustiveCode satisfies never;
}

export async function respondToAvatarRequest(
  request: Request,
  session: AuthSession | null,
  avatars: Pick<AvatarService, "get">,
): Promise<Response> {
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const avatarResult = await avatars.get(session.userId);

  if (!avatarResult.ok) {
    const errorResponse = mapAvatarErrorResponse(avatarResult.error.code);
    return new Response(errorResponse.body, { status: errorResponse.status });
  }

  const avatar = avatarResult.value;
  const etag = `"avatar-${session.userId}-v${avatar.version}"`;

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { etag, "cache-control": "private, no-cache" },
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
}
