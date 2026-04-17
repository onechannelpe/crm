import { describe, expect, it, vi } from "vitest";

import { enqueueDueCampaigns } from "../../src/server/notifications/application/enqueue-due-campaigns";
import type { NotificationServiceDeps } from "../../src/server/notifications/domain/types";

describe("enqueueDueCampaigns", () => {
  it("processes audience in pages and enqueues recipients/jobs in bulk", async () => {
    const campaign = {
      id: 99,
      audience_type: "global",
      audience_ref: null,
      event_type: "broadcast.general",
    };

    const audienceRepo = {
      findAudienceMembersPage: vi
        .fn()
        .mockResolvedValueOnce([
          { id: 1, email: "u1@example.com", role: "admin" },
          { id: 2, email: "u2@example.com", role: "admin" },
        ])
        .mockResolvedValueOnce([
          { id: 3, email: "u3@example.com", role: "admin" },
        ])
        .mockResolvedValueOnce([]),
    };

    const deliveryLogRepo = {
      markRecipientSent: vi.fn(),
      markRecipientFailed: vi.fn(),
      createDelivery: vi.fn(),
      createRecipientsForEmailUsers: vi.fn().mockResolvedValue(undefined),
      createRecipientsForWhatsAppUsers: vi.fn().mockResolvedValue(undefined),
    };

    const deliveryJobRepo = {
      claimPendingJobsByChannel: vi.fn(),
      extendJobLease: vi.fn(),
      markJobSent: vi.fn(),
      scheduleJobRetry: vi.fn(),
      markJobFailed: vi.fn(),
      createPendingJobsForCampaignUsers: vi.fn().mockResolvedValue(undefined),
    };

    const deps = {
      repos: {
        notificationCampaign: {
          findQueuedCampaigns: vi.fn().mockResolvedValue([campaign]),
          markProcessing: vi.fn().mockResolvedValue({ numUpdatedRows: 1 }),
          markCompleted: vi.fn().mockResolvedValue(undefined),
          markFailed: vi.fn().mockResolvedValue(undefined),
          createCampaign: vi.fn(),
        },
        notificationAudience: audienceRepo,
        notificationContact: {
          listByUser: vi.fn(),
          upsertPrimary: vi.fn(),
        },
        notificationPreference: {
          upsert: vi.fn(),
        },
        notificationDeliveryLog: deliveryLogRepo,
        notificationDeliveryJob: deliveryJobRepo,
      },
      messaging: {
        sendCampaignEmail: vi.fn(),
        sendWhatsAppText: vi.fn(),
        sendInviteEmail: vi.fn(),
        sendPasswordResetEmail: vi.fn(),
        sendAccountExpiringEmail: vi.fn(),
      },
      logger: {
        error: vi.fn(),
      },
    } satisfies NotificationServiceDeps;

    await enqueueDueCampaigns(deps, 1);

    expect(audienceRepo.findAudienceMembersPage).toHaveBeenCalledTimes(3);
    expect(
      deliveryLogRepo.createRecipientsForEmailUsers,
    ).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ campaignId: 99, userIds: [1, 2] }),
    );
    expect(
      deliveryLogRepo.createRecipientsForWhatsAppUsers,
    ).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ campaignId: 99, userIds: [3] }),
    );
    expect(
      deliveryJobRepo.createPendingJobsForCampaignUsers,
    ).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ campaignId: 99, userIds: [3], maxAttempts: 5 }),
    );
    expect(deps.repos.notificationCampaign.markCompleted).toHaveBeenCalledWith(
      99,
      expect.any(Number),
    );
    expect(deps.repos.notificationCampaign.markFailed).not.toHaveBeenCalled();
  });
});
