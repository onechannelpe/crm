import { createAuthRuntime } from "./auth-runtime";
import { createCapacityRuntime } from "./capacity-runtime";
import { createClientSearchRuntime } from "./client-search-runtime";
import { createContactAssignmentsRuntime } from "./contact-assignments-runtime";
import { createExtensionRuntime } from "./extension-runtime";
import { createServerInfra } from "./infra";
import { createNotificationsRuntime } from "./notifications-runtime";
import { createObservabilityRuntime } from "./observability-runtime";
import { createPipelineRuntime } from "./pipeline-runtime";
import { createProfilePictureRuntime } from "./profile-picture-runtime";
import { createSalesRecordsRuntime } from "./sales-records-runtime";
import { createSalesRuntime } from "./sales-runtime";
import { createSearchRuntime } from "./search-runtime";
import { createSecurityRuntime } from "./security-runtime";
import { createTeamRuntime } from "./team-runtime";

export function createServerRuntime() {
  const infra = createServerInfra();

  return {
    infra,
    auth: createAuthRuntime(infra),
    capacity: createCapacityRuntime(infra),
    clientSearch: createClientSearchRuntime(infra),
    contactAssignments: createContactAssignmentsRuntime(infra),
    extension: createExtensionRuntime(infra),
    notifications: createNotificationsRuntime(),
    observability: createObservabilityRuntime(infra),
    pipeline: createPipelineRuntime(infra),
    profilePicture: createProfilePictureRuntime(infra),
    security: createSecurityRuntime(infra),
    sales: createSalesRuntime(infra),
    salesRecords: createSalesRecordsRuntime(infra),
    search: createSearchRuntime(infra),
    team: createTeamRuntime(infra),
  };
}

export const serverRuntime = createServerRuntime();
