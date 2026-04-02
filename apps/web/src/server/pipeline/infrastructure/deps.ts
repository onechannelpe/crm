import { serializeAuditChanges } from "~/lib/contracts/audit";
import { db } from "~/lib/db/db";
import { createAppNotificationsRepo } from "~/server/notifications/repos-app-notifications";
import { createUsersRepo } from "~/server/users/repos-users";

import { createAppNotificationCenter } from "../../notifications/app-center-service";
import type { DatabaseExecutor } from "../../shared/db-executor";
import { createAuditLogsRepo } from "../../shared/repos-audit-logs";
import type {
  AuditLogDraft,
  AuditLogRepository,
  PipelineAuditService,
  PipelineEngineGateway,
  PipelineUserRepository,
} from "../application/ports";
import { createAssignmentRepo } from "./assignment-repo";
import { createCommercialInputRepo } from "./commercial-input-repo";
import { createEngineGateway } from "./engine-gateway";
import { createHistoryRepo } from "./history-repo";
import { createLeadRepo } from "./lead-repo";
import { createQuotationRepo } from "./quotation-repo";
import { createSaleRepo } from "./sale-repo";
import { createSourcingPolicyRepo } from "./sourcing-policy-repo";

export function createPipelineDeps(executor: DatabaseExecutor) {
  const users = createUsersRepo(executor);
  const auditLogs = createAuditLogsRepo(executor);

  return {
    leads: createLeadRepo(executor),
    leadAssignments: createAssignmentRepo(executor),
    leadHistory: createHistoryRepo(executor),
    leadCommercialInputs: createCommercialInputRepo(executor),
    leadQuotations: createQuotationRepo(executor),
    leadSales: createSaleRepo(executor),
    sourcingPolicies: createSourcingPolicyRepo(executor),
    users: {
      async findById(id: number) {
        const user = await users.findById(id);
        if (!user) {
          return undefined;
        }

        return {
          id: user.id,
          isActive: user.is_active === 1,
        };
      },
    } satisfies PipelineUserRepository,
    auditLogs: {
      create(values: AuditLogDraft) {
        return auditLogs.create({
          user_id: values.userId,
          action: values.action,
          entity_type: values.entityType,
          entity_id: values.entityId,
          changes: values.changes,
          created_at: values.createdAt,
        });
      },
    } satisfies AuditLogRepository,
  };
}

export function createPipelineQueryDeps() {
  return createPipelineDeps(db);
}

export function createPipelineAuditService(deps: {
  auditLogs: AuditLogRepository;
}): PipelineAuditService {
  return {
    log(actorUserId, action, entityType, entityId, changes) {
      return deps.auditLogs.create({
        userId: actorUserId,
        action,
        entityType,
        entityId,
        changes: serializeAuditChanges(changes),
        createdAt: Date.now(),
      });
    },
  };
}

export function createPipelineNotificationCenter(
  executor: DatabaseExecutor = db,
) {
  return createAppNotificationCenter({
    repos: {
      appNotifications: createAppNotificationsRepo(executor),
      users: createUsersRepo(executor),
    },
  });
}

export function createPipelineEngineGateway(): PipelineEngineGateway {
  return createEngineGateway();
}
