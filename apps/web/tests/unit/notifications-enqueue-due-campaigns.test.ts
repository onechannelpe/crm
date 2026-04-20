import { describe, expect, it, vi } from "vitest";

import {
  type AudiencePageLoader,
  type BatchProvisioner,
  enqueueCampaignAudience,
} from "../../src/server/notifications/application/enqueue-due-campaigns";
import { asUserId } from "../../src/server/shared/ids";

describe("enqueueCampaignAudience", () => {
  it("iterates through all pages and provisions each batch", async () => {
    const loadPage = vi.fn<AudiencePageLoader>();
    loadPage
      .mockResolvedValueOnce([asUserId("10"), asUserId("20")])
      .mockResolvedValueOnce([asUserId("30")])
      .mockResolvedValueOnce([]);

    const provisionBatch = vi
      .fn<BatchProvisioner>()
      .mockResolvedValue(undefined);

    await enqueueCampaignAudience(loadPage, provisionBatch);

    expect(loadPage).toHaveBeenCalledTimes(3);
    expect(loadPage).toHaveBeenNthCalledWith(1, asUserId("0") as any, 250); // pagination offset was numeric, wait
    expect(loadPage).toHaveBeenNthCalledWith(2, asUserId("20"), 250);
    expect(loadPage).toHaveBeenNthCalledWith(3, asUserId("30"), 250);

    expect(provisionBatch).toHaveBeenCalledTimes(2);
    expect(provisionBatch).toHaveBeenCalledWith([
      asUserId("10"),
      asUserId("20"),
    ]);
    expect(provisionBatch).toHaveBeenCalledWith([asUserId("30")]);
  });
});
