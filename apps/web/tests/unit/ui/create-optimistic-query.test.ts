import { createRoot } from "solid-js";
import { describe, expect, it, vi } from "vitest";

function noopDispose(): void {
  return undefined;
}

const router = vi.hoisted(() => {
  const resource: { current: unknown; latest: unknown } = {
    current: undefined,
    latest: undefined,
  };

  return {
    resource,
    createAsync: vi.fn<
      (_query: unknown, options: { initialValue: unknown }) => () => unknown
    >((_query: unknown, options: { initialValue: unknown }) => {
      resource.current = options.initialValue;
      resource.latest = options.initialValue;

      const accessor = () => resource.current;
      Object.defineProperty(accessor, "latest", {
        get: () => resource.latest,
      });
      return accessor;
    }),
    revalidate: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
});

vi.mock("@solidjs/router", () => ({
  createAsync: router.createAsync,
  revalidate: router.revalidate,
}));

import { createOptimisticQuery } from "~/browser/ui/create-optimistic-query";

describe("createOptimisticQuery", () => {
  it("retains defined data while the resource is temporarily undefined", () => {
    const initialValue = { unreadCount: 0 };
    const query = Object.assign(async () => initialValue, { key: "feed" });
    let dispose: () => void = noopDispose;
    const result = createRoot((rootDispose) => {
      dispose = rootDispose;
      return createOptimisticQuery(query, { initialValue });
    });

    const confirmedValue = { unreadCount: 3 };
    router.resource.latest = confirmedValue;
    router.resource.current = undefined;

    expect(result.data()).toBe(confirmedValue);

    router.resource.latest = undefined;
    expect(result.data()).toBe(initialValue);
    dispose();
  });
});
