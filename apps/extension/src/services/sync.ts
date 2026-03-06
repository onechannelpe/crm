import type { QueueJob, SyncConfig } from "@/src/domain/model";

export type SyncResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export async function sendSyncJob(
  config: SyncConfig,
  job: QueueJob,
): Promise<SyncResult> {
  if (!config.apiBaseUrl || !config.sessionToken) {
    return { ok: false, error: "sync is not configured" };
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/extension/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.sessionToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        id: job.id,
        type: job.type,
        payload: job.payload,
        createdAt: job.createdAt,
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `sync failed with status ${response.status}`,
      };
    }

    return { ok: true };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { ok: false, error: error.message };
    }

    return { ok: false, error: "sync failed with unknown error" };
  }
}
