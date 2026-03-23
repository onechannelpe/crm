import { describe, expect, it } from "vitest";

import {
  collectPendingCatalogChanges,
  summarizeCatalogSaveResults,
} from "../../src/routes/(app)/settings/catalog-save";

describe("catalog save helpers", () => {
  it("blocks submission when any dirty draft has an invalid price", () => {
    const result = collectPendingCatalogChanges({
      products: [
        { id: 1, price: 10, is_active: 1 },
        { id: 2, price: 20, is_active: 1 },
      ],
      drafts: {
        1: { price: "11.50", isActive: true },
        2: { price: "0", isActive: false },
      },
      dirtyIds: [1, 2],
    });

    expect(result).toEqual({ ok: false, reason: "invalid-price" });
  });

  it("keeps failed draft ids out of the success list during partial saves", () => {
    const changesResult = collectPendingCatalogChanges({
      products: [
        { id: 1, price: 10, is_active: 1 },
        { id: 2, price: 20, is_active: 1 },
      ],
      drafts: {
        1: { price: "11.50", isActive: true },
        2: { price: "21.00", isActive: false },
      },
      dirtyIds: [1, 2],
    });

    expect(changesResult.ok).toBe(true);
    if (!changesResult.ok) {
      return;
    }

    const summary = summarizeCatalogSaveResults(changesResult.changes, [
      { status: "fulfilled", value: undefined },
      { status: "rejected", reason: new Error("boom") },
    ]);

    expect(summary.status).toBe("partial-failure");
    expect(summary.successfulIds).toEqual([1]);
    expect(summary.firstError).toBeInstanceOf(Error);
  });
});
