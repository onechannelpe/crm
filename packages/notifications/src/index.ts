export { createNotificationService } from "./service";
export type {
  NotificationChannel,
  NotificationSendInput,
  NotificationService,
  NotificationsConfig,
} from "./types";
export { renderInviteEmail } from "./templates/invite-email";
export type { InviteEmailParams } from "./templates/invite-email";
export { renderCampaignEmail } from "./templates/campaign-email";
export type { CampaignEmailParams } from "./templates/campaign-email";
