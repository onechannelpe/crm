import { createJobQueue } from "~/lib/job-queue/job-queue";
import type { DatabaseExecutor } from "~/server/shared/db-executor";

import {
  createWorkflowNotificationOutboxRepo,
  type WorkflowNotificationOutboxRepo,
} from "./workflow-notification-outbox-repo";

interface Deps {
  executor: DatabaseExecutor;
  repo?: WorkflowNotificationOutboxRepo;
}

type WorkflowNotificationOutboxJob = {
  id: string;
  attempt_count: number;
  max_attempts: number;
  source_event_id: string;
  event_type: string;
  priority: "high" | "normal" | "low";
  title: string;
  body_text: string;
  action_url: string | null;
  audience_kind: "executive" | "branch_role";
  audience_roles_csv: string | null;
  executive_id: number;
  branch_id: number | null;
};

export function createWorkflowNotificationOutboxQueue(
  workerId: string,
  deps: Deps,
) {
  const leaseMs = 30_000;
  const batchSize = 50;
  const executor = deps.executor;
  const repo = deps.repo ?? createWorkflowNotificationOutboxRepo(executor);

  return createJobQueue<WorkflowNotificationOutboxJob, void>({
    name: "workflow-notification-outbox",
    leaseMs,
    batchSize,
    poll: (limit: number) => repo.claimPending(workerId, limit, leaseMs),
    handle: async (job) => {
      if (job.audience_kind === "executive") {
        await executor
          .insertInto("app_notifications")
          .values({
            user_id: job.executive_id,
            source_event_id: job.source_event_id,
            event_type: job.event_type,
            priority: job.priority,
            title: job.title,
            body_text: job.body_text,
            action_url: job.action_url,
            metadata_json: null,
            created_at: Date.now(),
            read_at: null,
          })
          .onConflict((oc) =>
            oc.columns(["user_id", "source_event_id"]).doNothing(),
          )
          .execute();
        return;
      }

      const roles = (job.audience_roles_csv ?? "")
        .split(",")
        .map((it) => it.trim())
        .filter((it) => it.length > 0);
      if (roles.length < 1 || job.branch_id === null || job.branch_id <= 0) {
        return;
      }

      const audience = await executor
        .selectFrom("users")
        .select("id")
        .where("branch_id", "=", job.branch_id)
        .where("role", "in", roles as Array<"back_office">)
        .where("is_active", "=", 1)
        .where("onboarding_completed_at", "is not", null)
        .execute();

      if (audience.length < 1) {
        return;
      }

      await executor
        .insertInto("app_notifications")
        .values(
          audience.map((user) => ({
            user_id: user.id,
            source_event_id: job.source_event_id,
            event_type: job.event_type,
            priority: job.priority,
            title: job.title,
            body_text: job.body_text,
            action_url: job.action_url,
            metadata_json: null,
            created_at: Date.now(),
            read_at: null,
          })),
        )
        .onConflict((oc) =>
          oc.columns(["user_id", "source_event_id"]).doNothing(),
        )
        .execute();
    },
    extendLease: (id: string) => repo.extendLease(id, workerId, leaseMs),
    onComplete: (id: string) => repo.markCompleted(id),
    onRetry: (id: string, availableAt: number) =>
      repo.scheduleRetry(id, availableAt),
    onFail: (id: string, reason: string) => repo.markFailed(id, reason),
  });
}
