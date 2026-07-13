import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock, getMock } = vi.hoisted(() => ({
  getSessionMock: vi.fn<() => Promise<{ userId: number } | null>>(),
  getMock: vi.fn<() => Promise<unknown>>(),
}));

vi.mock("~/lib/auth/access/session", () => ({
  getSession: getSessionMock,
}));

vi.mock("~/server/platform/container", () => ({
  getServerRuntime: () => ({
    avatar: {
      avatarService: {
        get: getMock,
      },
    },
  }),
}));

import { GET } from "~/routes/api/me/avatar";

describe("GET /api/me/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when session is missing", async () => {
    getSessionMock.mockResolvedValue(null);

    const response = await GET({
      request: new Request("http://localhost/api/me/avatar"),
    });

    expect(response.status).toBe(401);
    expect(getMock).not.toHaveBeenCalled();
  });

  it("returns 404 when avatar is missing", async () => {
    getSessionMock.mockResolvedValue({ userId: 7 });
    getMock.mockResolvedValue({
      ok: false,
      error: { code: "avatar_not_found" },
    });

    const response = await GET({
      request: new Request("http://localhost/api/me/avatar"),
    });

    expect(response.status).toBe(404);
  });

  it("returns 503 when avatar storage is unavailable", async () => {
    getSessionMock.mockResolvedValue({ userId: 7 });
    getMock.mockResolvedValue({
      ok: false,
      error: { code: "storage_unavailable" },
    });

    const response = await GET({
      request: new Request("http://localhost/api/me/avatar"),
    });

    expect(response.status).toBe(503);
    await expect(response.text()).resolves.toBe(
      "Profile picture service unavailable",
    );
  });

  it("returns 304 when ETag matches", async () => {
    getSessionMock.mockResolvedValue({ userId: 7 });
    getMock.mockResolvedValue({
      ok: true,
      value: {
        storageKey: "7/avatar.png",
        mimeType: "image/png",
        version: 3,
        updatedAt: Date.now(),
        bytes: new Uint8Array([1, 2, 3]),
      },
    });

    const response = await GET({
      request: new Request("http://localhost/api/me/avatar", {
        headers: {
          "if-none-match": '"avatar-7-v3"',
        },
      }),
    });

    expect(response.status).toBe(304);
    expect(response.headers.get("etag")).toBe('"avatar-7-v3"');
  });

  it("returns image bytes and content type when avatar exists", async () => {
    getSessionMock.mockResolvedValue({ userId: 7 });
    getMock.mockResolvedValue({
      ok: true,
      value: {
        storageKey: "7/avatar.png",
        mimeType: "image/png",
        version: 4,
        updatedAt: Date.now(),
        bytes: new Uint8Array([1, 2, 3]),
      },
    });

    const response = await GET({
      request: new Request("http://localhost/api/me/avatar"),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("etag")).toBe('"avatar-7-v4"');

    const body = new Uint8Array(await response.arrayBuffer());
    expect(Array.from(body)).toEqual([1, 2, 3]);
  });

  it("returns 404 when user is not found", async () => {
    getSessionMock.mockResolvedValue({ userId: 9 });
    getMock.mockResolvedValue({ ok: false, error: { code: "user_not_found" } });

    const response = await GET({
      request: new Request("http://localhost/api/me/avatar"),
    });

    expect(response.status).toBe(404);
    await expect(response.text()).resolves.toBe("User not found");
  });

  it("returns 503 when repository is unavailable", async () => {
    getSessionMock.mockResolvedValue({ userId: 7 });
    getMock.mockResolvedValue({
      ok: false,
      error: { code: "repository_unavailable" },
    });

    const response = await GET({
      request: new Request("http://localhost/api/me/avatar"),
    });

    expect(response.status).toBe(503);
  });
});
