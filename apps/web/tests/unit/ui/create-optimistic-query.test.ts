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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function mountQuery(initialValue: { unreadCount: number }) {
  const query = Object.assign(async () => initialValue, { key: "feed" });
  let dispose: () => void = noopDispose;
  const result = createRoot((rootDispose) => {
    dispose = rootDispose;
    return createOptimisticQuery(query, { initialValue });
  });
  return { result, dispose };
}

describe("createOptimisticQuery", () => {
  it("retains defined data while the resource is temporarily undefined", () => {
    const initialValue = { unreadCount: 0 };
    const { result, dispose } = mountQuery(initialValue);

    const confirmedValue = { unreadCount: 3 };
    router.resource.latest = confirmedValue;
    router.resource.current = undefined;

    expect(result.data()).toBe(confirmedValue);

    router.resource.latest = undefined;
    expect(result.data()).toBe(initialValue);
    dispose();
  });

  it("applies the optimistic value immediately, before commit settles", () => {
    const initialValue = { unreadCount: 0 };
    const { result, dispose } = mountQuery(initialValue);
    const commit = deferred<void>();

    void result.update({
      optimistic: (current) => ({ unreadCount: current.unreadCount + 1 }),
      commit: () => commit.promise,
    });

    expect(result.data()).toEqual({ unreadCount: 1 });
    commit.resolve();
    dispose();
  });

  it("rolls back the optimistic value when commit rejects", async () => {
    const initialValue = { unreadCount: 0 };
    const { result, dispose } = mountQuery(initialValue);
    const failure = new Error("commit failed");

    await expect(
      result.update({
        optimistic: (current) => ({ unreadCount: current.unreadCount + 1 }),
        commit: () => Promise.reject(failure),
      }),
    ).rejects.toBe(failure);

    expect(result.data()).toBe(initialValue);
    dispose();
  });

  it("invalidate revalidates the query and clears the optimistic overlay", async () => {
    const initialValue = { unreadCount: 0 };
    const { result, dispose } = mountQuery(initialValue);

    await result.update({
      optimistic: (current) => ({ unreadCount: current.unreadCount + 1 }),
      commit: () => Promise.resolve(),
    });
    expect(result.data()).toEqual({ unreadCount: 1 });

    await result.invalidate();

    expect(router.revalidate).toHaveBeenCalledWith("feed");
    expect(result.data()).toBe(initialValue);
    dispose();
  });
});
