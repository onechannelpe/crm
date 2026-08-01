import "server-only";
import { createAuditActionPoliciesRepo } from "~/server/audit-reader/audit-policy-repo";
import { createAuditPolicyService } from "~/server/audit-reader/policy-service";
import { createAuthRuntime } from "~/server/auth/runtime";
import { runSessionCleanupTick } from "~/server/auth/session/cleanup";
import { createCapacityRuntime } from "~/server/capacity/runtime";
import { createClientSearchRuntime } from "~/server/client-search/runtime";
import { createContactAssignmentsRuntime } from "~/server/contact-assignments/runtime";
import { createEventLogsService } from "~/server/event-logs/service";
import { createExtensionRuntime } from "~/server/extension/runtime";
import { createFilesRuntime } from "~/server/files/runtime";
import { createDefaultEngineClient } from "~/server/integrations/engine/client";
import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";
import { createMerchantStatsRuntime } from "~/server/merchant-stats/infrastructure/runtime";
import { createNotificationsRuntime } from "~/server/notifications/runtime";
import { createActionObservationsRepo } from "~/server/observability/repos-action-observations";
import { createAuthFunnelEventsRepo } from "~/server/observability/repos-auth-funnel-events";
import { createObservabilityService } from "~/server/observability/service";
import {
  serverInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";
import {
  appConfig,
  engineConfig,
  notificationsConfig,
  uploadsConfig,
} from "~/server/platform/config/env";
import { createRecordImportsRuntime } from "~/server/records/imports/runtime";
import { createSearchRuntime } from "~/server/search/runtime";
import { createRequestSessionsRepo } from "~/server/security/repos-request-sessions";
import { createTeamRuntime } from "~/server/team/runtime";
import { createAccountLifecycleMaintenance } from "~/server/users/account-lifecycle-maintenance";
import { createUsersRuntime } from "~/server/users/runtime";
import { createLeadReservationMaintenance } from "~/server/workflow/maintenance/lead-reservation-maintenance";
import { createWorkflowRuntime } from "~/server/workflow/runtime";

export function createApplication(infrastructure: ServerInfrastructure) {
  const applicationConfig = appConfig();
  const files = createFilesRuntime(infrastructure, uploadsConfig());
  const notifications = createNotificationsRuntime(
    infrastructure,
    notificationsConfig(),
    applicationConfig,
  );
  const observability = createObservabilityService({
    actionObservations: createActionObservationsRepo(infrastructure.db),
    authFunnelEvents: createAuthFunnelEventsRepo(infrastructure.db),
  });
  const engine = createDefaultEngineClient(engineConfig());
  const integrationRuntime = createIntegrationRuntime({
    executor: infrastructure.db,
  });
  const recordImports = createRecordImportsRuntime(
    integrationRuntime,
    files.storage,
  );
  const auth = createAuthRuntime(infrastructure, notifications, observability);
  const users = createUsersRuntime(
    infrastructure,
    { revokeAllForUser: auth.sessions.invalidateUser },
    uploadsConfig(),
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
    capacity: createCapacityRuntime(infrastructure),
    clientSearch: createClientSearchRuntime(infrastructure, engine),
    contactAssignments: createContactAssignmentsRuntime({
      executor: infrastructure.db,
      engine,
    }),
    eventLogs: createEventLogsService(infrastructure.db),
    extension: createExtensionRuntime(infrastructure),
    files: {
      download: files.download,
    },
    http: {
      requestContext: {
        resolveAuthSession: auth.sessions.resolve,
        requestSessions,
      },
    },
    integration: { records: recordImports },
    merchantStats: createMerchantStatsRuntime({ db: infrastructure.db, files }),
    maintenance: {
      accountLifecycle,
      cleanupSessions: (context: Parameters<typeof runSessionCleanupTick>[1]) =>
        runSessionCleanupTick(infrastructure.db, context),
      leadReservation,
      createRecordsImportQueue: recordImports.createQueue,
    },
    notifications,
    observability,
    search: createSearchRuntime(infrastructure, engine),
    team: createTeamRuntime(
      infrastructure,
      applicationConfig.publicOrigin,
      notifications.messaging,
    ),
    users,
    workflow: createWorkflowRuntime(infrastructure, engine, files),
  };
}

export const application = createApplication(serverInfrastructure);
