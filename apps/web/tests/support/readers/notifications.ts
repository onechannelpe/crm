import type { TestRuntime } from "../runtime/app";

export function createNotificationReader(runtime: TestRuntime) {
  return {
    intents() {
      return runtime.ctx.db
        .selectFrom("notification_intents")
        .selectAll()
        .orderBy("created_at", "asc")
        .execute();
    },
    appNotifications() {
      return runtime.ctx.db
        .selectFrom("app_notifications")
        .select(["user_id", "event_type", "source_event_id"])
        .orderBy("id", "asc")
        .execute();
    },
    deliveries() {
      return runtime.ctx.db
        .selectFrom("notification_deliveries")
        .selectAll()
        .orderBy("id", "asc")
        .execute();
    },
  };
}
