import { createAdminRuntime } from "./admin-runtime";
import { createAuthRuntime } from "./auth-runtime";
import { createCapacityRuntime } from "./capacity-runtime";
import { createClientSearchRuntime } from "./client-search-runtime";
import { createContactAssignmentsRuntime } from "./contact-assignments-runtime";
import { createExtensionRuntime } from "./extension-runtime";
import { createServerInfra } from "./infra";
import { createIntegrationsRuntime } from "./integrations-runtime";
import { createInventoryRuntime } from "./inventory-runtime";
import { createNotificationsRuntime } from "./notifications-runtime";
import { createObservabilityRuntime } from "./observability-runtime";
import { createPipelineRuntime } from "./pipeline-runtime";
import { createProfilePictureRuntime } from "./profile-picture-runtime";
import { createSalesRecordsRuntime } from "./sales-records-runtime";
import { createSalesRuntime } from "./sales-runtime";
import { createSearchRuntime } from "./search-runtime";
import { createSecurityRuntime } from "./security-runtime";
import { createTeamRuntime } from "./team-runtime";
import { createUsersRuntime } from "./users-runtime";

export function createServerRuntime() {
  const infra = createServerInfra();
  const notifications = createNotificationsRuntime(infra);

  return {
    infra,
    admin: createAdminRuntime(infra),
    auth: createAuthRuntime(infra, notifications.messaging),
    capacity: createCapacityRuntime(infra),
    clientSearch: createClientSearchRuntime(infra),
    contactAssignments: createContactAssignmentsRuntime(infra),
    extension: createExtensionRuntime(infra),
    integrations: createIntegrationsRuntime(infra),
    inventory: createInventoryRuntime(infra),
    notifications,
    observability: createObservabilityRuntime(infra),
    pipeline: createPipelineRuntime(infra),
    profilePicture: createProfilePictureRuntime(infra),
    security: createSecurityRuntime(infra),
    sales: createSalesRuntime(infra),
    salesRecords: createSalesRecordsRuntime(infra),
    search: createSearchRuntime(infra),
    team: createTeamRuntime(infra),
    users: createUsersRuntime(infra),
  };
}

export const serverRuntime = createServerRuntime();
