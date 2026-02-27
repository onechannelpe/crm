import { describe, expect, it, vi } from "vitest";

import { createClientSearchService } from "~/server/client-search/service";
import type { EngineClient } from "~/server/shared/engine/client";

describe("client search service", () => {
  it("returns results from engine client", async () => {
    const engine: EngineClient = {
      health: vi.fn(async () => true),
      search: vi.fn(async () => ({
        count: 1,
        results: [
          {
            person: {
              dni: "12345678",
              name: "Juan Perez",
            },
            org: {
              ruc: "20100000001",
              name: "ACME SAC",
            },
            role: null,
            phones: { primary: "999111222", secondary: null, siblings: null },
          },
        ],
      })),
    };
    const service = createClientSearchService(engine);

    const result = await service.search({ type: "dni", value: "12345678" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected successful result");
    expect(result.value.count).toBe(1);
  });

  it("returns err result when engine request fails", async () => {
    const engine: EngineClient = {
      health: vi.fn(async () => true),
      search: vi.fn(async () => {
        throw new Error("engine unavailable");
      }),
    };
    const service = createClientSearchService(engine);

    const result = await service.search({ type: "dni", value: "12345678" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error result");
    expect(result.error.reason).toBe("engine_request_failed");
    expect(result.error.message).toContain("engine unavailable");
  });
});
