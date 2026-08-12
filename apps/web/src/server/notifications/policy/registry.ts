import {
  buildFulfillmentCompletedIntent,
  buildFulfillmentStartedIntent,
  buildFulfillmentStepAdvancedIntent,
  buildFulfillmentStepRejectedIntent,
} from "./fulfillment";
import { buildLeadStageIntent } from "./lead-stage";
import { buildPrivilegedLoginIntent } from "./login";
import type { NotificationPolicy } from "./types";

// Registered by domain event `type`. A missing entry means the event is
// audit-only and never produces a notification; this is the single place
// that decides whether "something happened" also means "tell someone."
export const NOTIFICATION_EVENT_POLICIES: Partial<
  Record<string, NotificationPolicy>
> = {
  "security.privileged_login": { buildIntent: buildPrivilegedLoginIntent },
  workflow_stage_changed: { buildIntent: buildLeadStageIntent },
  fulfillment_started: { buildIntent: buildFulfillmentStartedIntent },
  fulfillment_step_advanced: {
    buildIntent: buildFulfillmentStepAdvancedIntent,
  },
  fulfillment_step_rejected: {
    buildIntent: buildFulfillmentStepRejectedIntent,
  },
  fulfillment_completed: { buildIntent: buildFulfillmentCompletedIntent },
};
