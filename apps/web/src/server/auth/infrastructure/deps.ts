import {
  notificationSender,
  privilegedLoginAlertSender,
  repos,
  runInRepositoryTransaction,
} from "~/server/shared/context";

export function createAuthDeps() {
  return {
    repos,
    notificationSender,
    privilegedLoginAlertSender,
    runInRepositoryTransaction,
  };
}

export type AuthDeps = ReturnType<typeof createAuthDeps>;

export type AdminSessionDeps = {
  repos: {
    extensionRuntime: {
      revokeInstallationSessionsByAuthSession(
        sessionId: string,
        now: number,
      ): Promise<unknown>;
      revokeInstallationSessionsByUser(
        userId: number,
        now: number,
      ): Promise<unknown>;
      updateExecutiveSyncHealthByUser(input: {
        user_id: number;
        sync_health: string;
        sync_updated_at: number;
      }): Promise<unknown>;
    };
    auditLogs: {
      create(input: {
        user_id: number;
        action: string;
        entity_type: string;
        entity_id: number;
        changes: string | null;
        created_at: number;
      }): Promise<unknown>;
    };
  };
};

export function createAdminSessionDeps(): AdminSessionDeps {
  return {
    repos: {
      extensionRuntime: repos.extensionRuntime,
      auditLogs: repos.auditLogs,
    },
  };
}
