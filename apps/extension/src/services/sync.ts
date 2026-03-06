import type { QueueJob, SyncConfig } from "@/src/domain/model";

export type SyncResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unauthorized" | "failed";
      error: string;
    };

export type RefreshSessionResult =
  | {
      ok: true;
      sessionToken: string;
      refreshToken: string;
    }
  | {
      ok: false;
      reason: "unauthorized" | "failed";
      error: string;
    };

export async function sendSyncJob(
  config: SyncConfig,
  job: QueueJob,
): Promise<SyncResult> {
  if (!config.apiBaseUrl || !config.sessionToken) {
    return { ok: false, reason: "failed", error: "sync is not configured" };
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
        sequence: job.sequence,
        type: job.type,
        payload: job.payload,
        createdAt: job.createdAt,
      }),
    });

    if (response.status === 401) {
      return {
        ok: false,
        reason: "unauthorized",
        error: "extension session token is invalid or expired",
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        reason: "failed",
        error: `sync failed with status ${response.status}`,
      };
    }

    return { ok: true };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { ok: false, reason: "failed", error: error.message };
    }

    return { ok: false, reason: "failed", error: "sync failed with unknown error" };
  }
}

export async function refreshSyncSession(
  config: SyncConfig,
  installationId: string,
): Promise<RefreshSessionResult> {
  if (!config.apiBaseUrl || !config.refreshToken) {
    return {
      ok: false,
      reason: "failed",
      error: "sync refresh is not configured",
    };
  }

  try {
    const response = await fetch(`${config.apiBaseUrl}/extension/session/refresh`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: config.refreshToken,
        installationId,
      }),
    });
    if (response.status === 401) {
      return {
        ok: false,
        reason: "unauthorized",
        error: "extension session refresh is invalid or expired",
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        reason: "failed",
        error: `sync refresh failed with status ${response.status}`,
      };
    }

    const body = (await response.json()) as {
      sessionToken?: unknown;
      refreshToken?: unknown;
    };
    if (
      typeof body.sessionToken !== "string" ||
      body.sessionToken === "" ||
      typeof body.refreshToken !== "string" ||
      body.refreshToken === ""
    ) {
      return {
        ok: false,
        reason: "failed",
        error: "sync refresh returned invalid credentials",
      };
    }

    return {
      ok: true,
      sessionToken: body.sessionToken,
      refreshToken: body.refreshToken,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      return { ok: false, reason: "failed", error: error.message };
    }

    return {
      ok: false,
      reason: "failed",
      error: "sync refresh failed with unknown error",
    };
  }
}
