import type { APIEvent } from "@solidjs/start/server";

import { requireSession } from "~/lib/auth/access/session";
import {
  profilePictureService,
  repos,
  profilePictureBlobStore,
} from "~/server/shared/context";

const JSON_HEADERS = { "content-type": "application/json; charset=utf-8" };

function errorStatus(error: unknown): number {
  const message = error instanceof Error ? error.message : "Unexpected error";

  if (message === "Unauthorized") return 401;
  if (message === "Profile picture is empty") return 400;
  if (message === "Profile picture exceeds 10MB limit") return 413;
  if (message === "Unsupported profile picture format") return 415;
  if (message === "User not found") return 404;
  if (message === "Profile picture not found") return 404;

  return 500;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected error";
}

function avatarUrl(version: number): string {
  return `/api/settings/profile/picture?v=${version}`;
}

export async function GET(event: Pick<APIEvent, "request">): Promise<Response> {
  try {
    const session = await requireSession();
    const avatar = await repos.users.findAvatarMetaById(session.userId);

    if (!avatar || !avatar.avatar_storage_key || !avatar.avatar_mime_type) {
      return new Response("Profile picture not found", { status: 404 });
    }

    const etag = `"avatar-${avatar.id}-v${avatar.avatar_version}"`;
    const ifNoneMatch = event.request.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new Response(null, {
        status: 304,
        headers: {
          etag,
          "cache-control": "private, no-cache",
        },
      });
    }

    let fileBytes: Uint8Array;
    try {
      fileBytes = await profilePictureBlobStore.get(avatar.avatar_storage_key);
    } catch {
      throw new Error("Profile picture not found");
    }
    const bodyBuffer = new ArrayBuffer(fileBytes.byteLength);
    new Uint8Array(bodyBuffer).set(fileBytes);

    return new Response(bodyBuffer, {
      status: 200,
      headers: {
        "content-type": avatar.avatar_mime_type,
        "cache-control": "private, no-cache",
        etag,
      },
    });
  } catch (error: unknown) {
    return new Response(errorMessage(error), { status: errorStatus(error) });
  }
}

export async function POST(
  event: Pick<APIEvent, "request">,
): Promise<Response> {
  try {
    const session = await requireSession();
    const formData = await event.request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return new Response("Missing profile picture file", { status: 400 });
    }

    const { avatarVersion } = await profilePictureService.upload(
      session.userId,
      file,
    );

    return new Response(
      JSON.stringify({
        success: true,
        avatarVersion,
        avatarUrl: avatarUrl(avatarVersion),
      }),
      {
        status: 200,
        headers: JSON_HEADERS,
      },
    );
  } catch (error: unknown) {
    return new Response(errorMessage(error), { status: errorStatus(error) });
  }
}

export async function DELETE(): Promise<Response> {
  try {
    const session = await requireSession();
    const { avatarVersion } = await profilePictureService.remove(
      session.userId,
    );

    return new Response(
      JSON.stringify({
        success: true,
        avatarVersion,
        avatarUrl: null,
      }),
      {
        status: 200,
        headers: JSON_HEADERS,
      },
    );
  } catch (error: unknown) {
    return new Response(errorMessage(error), { status: errorStatus(error) });
  }
}
