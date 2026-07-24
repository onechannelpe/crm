import type { NotificationIntent } from "~/server/notifications/types";
import { NotificationIntentId } from "~/server/shared/ids";

import type { InquiryRow } from "./repo";

// One notification per inquiry lifetime: the id derives from the inquiry, so
// an import retry that stamps the same answer again cannot enqueue a second
// intent.
export function deriveInquiryAnsweredIntents(
  answered: readonly InquiryRow[],
): NotificationIntent[] {
  return answered.map((inquiry) => ({
    id: NotificationIntentId.derive({
      sourceEventId: inquiry.id,
      discriminator: "inquiry_answered",
    }),
    eventType: "inquiry.answered",
    audience: { kind: "user_ids", userIds: [inquiry.executiveId] },
    channels: ["in_app"],
    priority: "normal",
    title: "Consulta respondida",
    bodyText:
      inquiry.priority === null
        ? `El RUC ${inquiry.ruc} resultó ${inquiry.status ?? ""}`.trim()
        : `El RUC ${inquiry.ruc} resultó ${inquiry.status}, prioridad ${inquiry.priority}`,
    actionUrl: "/inquiries",
  }));
}
