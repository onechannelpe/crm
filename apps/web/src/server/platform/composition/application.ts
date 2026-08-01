import "server-only";
import { randomUUID } from "node:crypto";

import type { RecordImportType } from "~/contracts/records/imports";
import { createAuditActionPoliciesRepo } from "~/server/audit-reader/audit-policy-repo";
import { createAuditPolicyService } from "~/server/audit-reader/policy-service";
import { runSessionCleanupTick } from "~/server/auth/session/cleanup";
import { createAuthComposition } from "~/server/auth/ui/composition";
import { createCapacityComposition } from "~/server/capacity/ui/composition";
import { createClientSearchComposition } from "~/server/client-search/ui/composition";
import { createContactAssignmentsContext } from "~/server/contact-assignments/infrastructure/context";
import { createEventLogsService } from "~/server/event-logs/service";
import { createExtensionComposition } from "~/server/extension/ui/composition";
import { executeDownload } from "~/server/files/service/execute-download";
import { createFilesComposition } from "~/server/files/ui/composition";
import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";
import { createRecordsImportQueue } from "~/server/integrations/queue/records-import-queue";
import { createEngineClient } from "~/server/integrations/ui/engine-client";
import { createMerchantStatsRuntime } from "~/server/merchant-stats/infrastructure/runtime";
import { createNotificationsRuntime } from "~/server/notifications/ui/composition";
import { createActionObservationsRepo } from "~/server/observability/repos-action-observations";
import { createAuthFunnelEventsRepo } from "~/server/observability/repos-auth-funnel-events";
import { createObservabilityService } from "~/server/observability/service";
import {
  serverInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";
import {
  appConfig,
  notificationsConfig,
  uploadsConfig,
} from "~/server/platform/config/env";
import { canAccessRecordImportJob } from "~/server/records/imports/api";
import {
  buildRecordImportProgressEvent,
  publishRecordImportProgress,
} from "~/server/records/imports/progress-events";
import { createSearchComposition } from "~/server/search/ui/composition";
import { createRequestSessionsRepo } from "~/server/security/repos-request-sessions";
import { createTeamComposition } from "~/server/team/ui/composition";
import { createAccountLifecycleMaintenance } from "~/server/users/account-lifecycle-maintenance";
import { createAvatarComposition } from "~/server/users/ui/avatar-composition";
import { createUsersComposition } from "~/server/users/ui/composition";
import { createLeadReservationMaintenance } from "~/server/workflow/maintenance/lead-reservation-maintenance";
import { createWorkflowComposition } from "~/server/workflow/ui/composition";

export function createApplication(infrastructure: ServerInfrastructure) {
  const applicationConfig = appConfig();
  const files = createFilesComposition(infrastructure, uploadsConfig());
  const notifications = createNotificationsRuntime(
    infrastructure,
    notificationsConfig(),
    applicationConfig,
  );
  const observability = createObservabilityService({
    actionObservations: createActionObservationsRepo(infrastructure.db),
    authFunnelEvents: createAuthFunnelEventsRepo(infrastructure.db),
  });
  const engine = createEngineClient();
  const integrationRuntime = createIntegrationRuntime({
    executor: infrastructure.db,
  });
  const integration = {
    records: {
      async createImport(input: {
        type: RecordImportType;
        requestedByUserId: Parameters<
          typeof integrationRuntime.jobs.insert
        >[0]["requested_by_user_id"];
        rowsTotal: number;
        payload: Uint8Array;
        createdAt: Date;
      }) {
        const storageKey = `imports/${randomUUID()}.json`;
        await files.storage.putBytes(storageKey, input.payload);
        const job = await integrationRuntime.jobs.insert({
          type: input.type,
          requested_by_user_id: input.requestedByUserId,
          file_path: storageKey,
          rows_total: input.rowsTotal,
          max_attempts: 3,
          created_at: input.createdAt,
        });
        publishRecordImportProgress(
          integrationRuntime.executor,
          buildRecordImportProgressEvent(job),
        );
        return job;
      },
      find: (jobId: Parameters<typeof integrationRuntime.jobs.findById>[0]) =>
        integrationRuntime.jobs.findById(jobId),
      canAccess: (
        actor: Parameters<typeof canAccessRecordImportJob>[0],
        job: Parameters<typeof canAccessRecordImportJob>[1],
      ) => canAccessRecordImportJob(actor, job, integrationRuntime),
    },
  };
  const auth = createAuthComposition(
    infrastructure,
    notifications,
    observability,
  );
  const avatar = createAvatarComposition(infrastructure, uploadsConfig());
  const users = createUsersComposition(
    infrastructure,
    { revokeAllForUser: auth.sessions.invalidateUser },
    avatar.avatarService,
  );
  const accountLifecycle = createAccountLifecycleMaintenance({
    executor: infrastructure.db,
    messaging: notifications.messaging,
    invalidateUserSessions: (userId) => auth.sessions.invalidateUser(userId),
  });
  const leadReservation = createLeadReservationMaintenance({
    executor: infrastructure.db,
  });
  const requestSessions = createRequestSessionsRepo(infrastructure.db);

  return {
    admin: createAuditPolicyService({
      auditActionPolicies: createAuditActionPoliciesRepo(infrastructure.db),
    }),
    auth,
    avatar,
    capacity: createCapacityComposition(infrastructure),
    clientSearch: createClientSearchComposition(infrastructure, engine),
    contactAssignments: createContactAssignmentsContext({
      executor: infrastructure.db,
      engine,
    }),
    eventLogs: createEventLogsService(infrastructure.db),
    engine,
    extension: createExtensionComposition(infrastructure),
    files: {
      download: (token: string, now: Date) =>
        executeDownload(token, files, now),
    },
    http: {
      requestContext: {
        resolveAuthSession: auth.sessions.resolve,
        requestSessions,
      },
    },
    integration,
    merchantStats: createMerchantStatsRuntime({ db: infrastructure.db, files }),
    maintenance: {
      accountLifecycle,
      cleanupSessions: (context: Parameters<typeof runSessionCleanupTick>[1]) =>
        runSessionCleanupTick(infrastructure.db, context),
      leadReservation,
      createRecordsImportQueue: (workerId: string) =>
        createRecordsImportQueue(workerId, {
          runtime: integrationRuntime,
          readFile: (storageKey) => files.storage.getBytes(storageKey),
        }),
    },
    notifications,
    observability,
    search: createSearchComposition(infrastructure),
    team: createTeamComposition(
      infrastructure,
      applicationConfig.publicOrigin,
      notifications.messaging,
    ),
    users,
    workflow: createWorkflowComposition(infrastructure, engine, files),
  };
}

export const application = createApplication(serverInfrastructure);
