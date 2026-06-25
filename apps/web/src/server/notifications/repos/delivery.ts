import type { Insertable, Kysely } from "kysely";

import type { Database, NotificationDeliveriesTable } from "~/lib/db/types";

export interface NotificationDeliveryRepository {
  record(values: Insertable<NotificationDeliveriesTable>): Promise<void>;
}

export function createNotificationDeliveryRepository(
  db: Kysely<Database>,
): NotificationDeliveryRepository {
  return {
    async record(values) {
      await db.insertInto("notification_deliveries").values(values).execute();
    },
  };
}
