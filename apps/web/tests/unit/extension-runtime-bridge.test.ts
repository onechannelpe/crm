import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("extension runtime bridge", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("VITE_CRM_EXTENSION_ID", "ext-test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    Reflect.deleteProperty(globalThis, "chrome");
  });

  it("keeps executive state on domain failures when the extension returns it", async () => {
    Object.assign(globalThis, {
      chrome: {
        runtime: {
          lastError: undefined,
          sendMessage: (
            _extensionId: string,
            _message: unknown,
            callback: (response?: unknown) => void,
          ) => {
            callback({
              ok: false,
              error: "cannot replace handoff during an active call",
              executiveState: {
                presenceStatus: "active",
                syncHealth: "ok",
                assignmentId: 42,
                contactId: 7,
                phone: "+51999999111",
                presenceUpdatedAt: 1_000,
                syncUpdatedAt: 1_000,
              },
            });
          },
        },
      },
    });

    const { handoffLeadToExtension } =
      await import("../../src/lib/extension/runtime");
    const result = await handoffLeadToExtension({ token: "handoff-token" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("bridge should surface the domain rejection");
    }
    expect(result.executiveState?.presenceStatus).toBe("active");
    expect(result.executiveState?.assignmentId).toBe(42);
  });
});
