import { describe, expect, it, vi } from "vitest";

import {
  type AudiencePageLoader,
  type BatchProvisioner,
  enqueueCampaignAudience,
} from "~/server/notifications/application/enqueue-due-campaigns";

describe("enqueueCampaignAudience", () => {
  it("iterates through all pages and provisions each batch", async () => {
    const loadPage = vi.fn<AudiencePageLoader>();
    loadPage
      .mockResolvedValueOnce([10, 20])
      .mockResolvedValueOnce([30])
      .mockResolvedValueOnce([]);

    const provisionBatch = vi
      .fn<BatchProvisioner>()
      .mockResolvedValue(undefined);

    await enqueueCampaignAudience(loadPage, provisionBatch);

    expect(loadPage).toHaveBeenCalledTimes(3);
    expect(loadPage).toHaveBeenNthCalledWith(1, 0, 250);
    expect(loadPage).toHaveBeenNthCalledWith(2, 20, 250);
    expect(loadPage).toHaveBeenNthCalledWith(3, 30, 250);

    expect(provisionBatch).toHaveBeenCalledTimes(2);
    expect(provisionBatch).toHaveBeenCalledWith([10, 20]);
    expect(provisionBatch).toHaveBeenCalledWith([30]);
  });
});
