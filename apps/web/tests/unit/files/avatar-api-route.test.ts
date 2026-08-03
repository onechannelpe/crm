import { makeAuthSession } from "@tests/support/unit/factories";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserId } from "~/domain/ids";
import { respondToAvatarRequest } from "~/server/users/avatar-http";

const getMock = vi.fn();
const session = makeAuthSession({ userId: UserId.trust("7") });

function requestAvatar(
  request = new Request("http://localhost/api/me/avatar"),
) {
  return respondToAvatarRequest(request, session, { get: getMock });
}

describe("avatar response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    const response = await respondToAvatarRequest(
      new Request("http://localhost/api/me/avatar"),
      null,
      { get: getMock },
    );

    expect(response.status).toBe(401);
    expect(getMock).not.toHaveBeenCalled();
  });

  it("reports a missing avatar", async () => {
    getMock.mockResolvedValue({
      ok: false,
      error: { code: "avatar_not_found" },
    });

    const response = await requestAvatar();

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("Profile picture not found");
  });

  it("reports unavailable avatar storage", async () => {
    getMock.mockResolvedValue({
      ok: false,
      error: { code: "storage_unavailable" },
    });

    const response = await requestAvatar();

    expect(response.status).toBe(503);
    await expect(response.text()).resolves.toBe(
      "Profile picture service unavailable",
    );
  });

  it("honors a matching ETag", async () => {
    getMock.mockResolvedValue({
      ok: true,
      value: {
        storageKey: "7/avatar.png",
        mimeType: "image/png",
        version: 3,
        updatedAt: new Date(),
        bytes: new Uint8Array([1, 2, 3]),
      },
    });

    const response = await requestAvatar(
      new Request("http://localhost/api/me/avatar", {
        headers: { "if-none-match": '"avatar-7-v3"' },
      }),
    );

    expect(response.status).toBe(304);
    expect(response.headers.get("etag")).toBe('"avatar-7-v3"');
  });

  it("returns the stored avatar", async () => {
    getMock.mockResolvedValue({
      ok: true,
      value: {
        storageKey: "7/avatar.png",
        mimeType: "image/png",
        version: 4,
        updatedAt: new Date(),
        bytes: new Uint8Array([1, 2, 3]),
      },
    });

    const response = await requestAvatar();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("etag")).toBe('"avatar-7-v4"');
    expect(Array.from(new Uint8Array(await response.arrayBuffer()))).toEqual([
      1, 2, 3,
    ]);
  });

  it("reports a missing user", async () => {
    getMock.mockResolvedValue({ ok: false, error: { code: "user_not_found" } });

    const response = await requestAvatar();

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("User not found");
  });

  it("reports an unavailable avatar repository", async () => {
    getMock.mockResolvedValue({
      ok: false,
      error: { code: "repository_unavailable" },
    });

    const response = await requestAvatar();

    expect(response.status).toBe(503);
  });
});
