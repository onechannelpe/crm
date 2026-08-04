import "server-only";
import { createAuditActionPoliciesRepo } from "~/server/audit-reader/audit-policy-repo";
import { createAuditPolicyService } from "~/server/audit-reader/policy-service";
import { createAccessSecurityContext } from "~/server/auth/infrastructure/session-revocation-context";
import { createAuthRuntime } from "~/server/auth/runtime";
import { runSessionCleanupTick } from "~/server/auth/session/cleanup";
import { createCapacityRuntime } from "~/server/capacity/runtime";
import { createClientSearchRuntime } from "~/server/client-search/runtime";
import { createContactAssignmentsRuntime } from "~/server/contact-assignments/runtime";
import { createEventLogsChannel } from "~/server/event-logs/realtime";
import { createEventLogsService } from "~/server/event-logs/service";
import { createExtensionRuntime } from "~/server/extension/runtime";
import { createFilesRuntime } from "~/server/files/runtime";
import { createDefaultEngineClient } from "~/server/integrations/engine/client";
import { createIntegrationRuntime } from "~/server/integrations/infrastructure/runtime";
import { createMerchantStatsRuntime } from "~/server/merchant-stats/infrastructure/runtime";
import { createGpvSnapshotChannel } from "~/server/merchant-stats/snapshot/realtime";
import { createNotificationsRuntime } from "~/server/notifications/runtime";
import { createActionObservationsRepo } from "~/server/observability/repos-action-observations";
import { createAuthFunnelEventsRepo } from "~/server/observability/repos-auth-funnel-events";
import { createObservabilityService } from "~/server/observability/service";
import { createOrganizationEnrichmentProjection } from "~/server/organization/apply-enrichment";
import { createOrganizationEnrichment } from "~/server/organization/enrichment";
import { createOrganizationRepo } from "~/server/organization/organization-repo";
import {
  appConfig,
  engineConfig,
  notificationsConfig,
  uploadsConfig,
} from "~/server/platform/config/env";
import { dbUrl } from "~/server/platform/database/db";
import {
  serverInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/infrastructure";
import type { OperationContext } from "~/server/platform/operation/context";
import { createRealtimeService } from "~/server/realtime/runtime";
import { createRecordImportChannel } from "~/server/records/imports/realtime";
import { createRecordImportsRuntime } from "~/server/records/imports/runtime";
import { createSearchRuntime } from "~/server/search/runtime";
import { createRequestSessionsRepo } from "~/server/security/repos-request-sessions";
import { createTeamRuntime } from "~/server/team/runtime";
import { createAccountLifecycleMaintenance } from "~/server/users/account-lifecycle-maintenance";
import { createUsersRuntime } from "~/server/users/runtime";
import { createLeadReservationMaintenance } from "~/server/workflow/maintenance/lead-reservation-maintenance";
import { createWorkflowRuntime } from "~/server/workflow/runtime";

function createApplication(infrastructure: ServerInfrastructure) {
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
  const organizationEnrichment = createOrganizationEnrichment(engine);
  const projectOrganization = createOrganizationEnrichmentProjection(
    createOrganizationRepo(infrastructure.db),
  );
  const clientSearch = createClientSearchRuntime(infrastructure, {
    fallbackOrganizationEnrichment: (ruc) =>
      organizationEnrichment.enrichByRuc(ruc),
    projectOrganization,
  });
  const integrationRuntime = createIntegrationRuntime({
    executor: infrastructure.db,
  });
  const recordImports = createRecordImportsRuntime(
    integrationRuntime,
    files.storage,
  );
  const eventLogs = createEventLogsService(infrastructure.db);
  const merchantStats = createMerchantStatsRuntime({
    db: infrastructure.db,
    files,
  });
  const auth = createAuthRuntime(infrastructure, notifications, observability);
  const users = createUsersRuntime(infrastructure, uploadsConfig());
  const accountLifecycle = createAccountLifecycleMaintenance({
    executor: infrastructure.db,
    messaging: notifications.messaging,
    accessSecurity: createAccessSecurityContext(infrastructure.db),
  });
  const leadReservation = createLeadReservationMaintenance({
    executor: infrastructure.db,
  });
  const requestSessions = createRequestSessionsRepo(infrastructure.db);
  const realtime = createRealtimeService({
    channels: [
      createEventLogsChannel(eventLogs),
      createGpvSnapshotChannel(merchantStats),
      createRecordImportChannel(recordImports),
    ],
    databaseUrl: dbUrl,
  });

  return {
    admin: createAuditPolicyService({
      auditActionPolicies: createAuditActionPoliciesRepo(infrastructure.db),
    }),
    auth,
    capacity: createCapacityRuntime(infrastructure),
    clientSearch,
    contactAssignments: createContactAssignmentsRuntime({
      executor: infrastructure.db,
      engine,
    }),
    eventLogs,
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
    merchantStats,
    maintenance: {
      accountLifecycle,
      cleanupSessions: (context: OperationContext) =>
        runSessionCleanupTick(infrastructure.db, context),
      leadReservation,
      createRecordsImportQueue: recordImports.createQueue,
    },
    notifications,
    observability,
    search: createSearchRuntime(infrastructure, engine),
    realtime,
    team: createTeamRuntime(
      infrastructure,
      applicationConfig.publicOrigin,
      notifications.messaging,
    ),
    users,
    workflow: createWorkflowRuntime(
      infrastructure,
      files,
      organizationEnrichment,
      {
        enqueueRucVerification: async (ruc, requestedByUserId, operation) => {
          await clientSearch.requestEnrichment(
            { kind: "ruc", value: ruc },
            requestedByUserId,
            operation,
          );
        },
      },
    ),
  };
}

export const application = createApplication(serverInfrastructure);
