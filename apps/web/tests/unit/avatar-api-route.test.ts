import { beforeEach, describe, expect, it, vi } from "vitest";

const requireSessionMock = vi.fn();
const getMock = vi.fn();

vi.mock("../../src/lib/auth/access/session", () => ({
  requireSession: requireSessionMock,
}));

vi.mock("../../src/server/shared/context", () => ({
  profilePictureService: {
    get: getMock,
  },
}));

import { GET } from "../../src/routes/api/me/avatar";

describe("GET /api/me/avatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 when avatar is missing", async () => {
    requireSessionMock.mockResolvedValue({ userId: 7 });
    getMock.mockResolvedValue({
      ok: false,
      error: { code: "avatar_not_found" },
    });

    const response = await GET({
      request: new Request("http://localhost/api/me/avatar"),
    });

    expect(response.status).toBe(404);
  });

  it("returns 304 when ETag matches", async () => {
    requireSessionMock.mockResolvedValue({ userId: 7 });
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
});
