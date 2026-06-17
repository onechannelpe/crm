import { createDefaultEngineClient } from "~/server/shared/engine/client";

import { createAdminRuntime } from "./admin-runtime";
import { createAuthRuntime } from "./auth-runtime";
import { createCapacityRuntime } from "./capacity-runtime";
import { createClientSearchRuntime } from "./client-search-runtime";
import { createContactAssignmentsRuntime } from "./contact-assignments-runtime";
import { createExtensionRuntime } from "./extension-runtime";
import { createFilesRuntime } from "./files-runtime";
import { createServerInfra } from "./infra";
import { createIntegrationsRuntime } from "./integrations-runtime";
import { createNotificationsRuntime } from "./notifications-runtime";
import { createObservabilityRuntime } from "./observability-runtime";
import { createProfilePictureRuntime } from "./profile-picture-runtime";
import { createSearchRuntime } from "./search-runtime";
import { createSecurityRuntime } from "./security-runtime";
import { createTeamRuntime } from "./team-runtime";
import { createUsersRuntime } from "./users-runtime";
import { createWorkflowRuntime } from "./workflow-runtime";

function createServerRuntime() {
  const infra = createServerInfra();
  const engine = createDefaultEngineClient();
  const notifications = createNotificationsRuntime(infra);
  const files = createFilesRuntime(infra);

  return {
    infra,
    engine,
    admin: createAdminRuntime(infra),
    files,
    auth: createAuthRuntime(infra, notifications),
    capacity: createCapacityRuntime(infra),
    clientSearch: createClientSearchRuntime(infra),
    contactAssignments: createContactAssignmentsRuntime(infra, engine),
    extension: createExtensionRuntime(infra),
    integrations: createIntegrationsRuntime(infra),
    notifications,
    observability: createObservabilityRuntime(infra),
    workflow: createWorkflowRuntime(infra, engine, files),
    profilePicture: createProfilePictureRuntime(infra),
    security: createSecurityRuntime(infra),
    search: createSearchRuntime(infra),
    team: createTeamRuntime(infra),
    users: createUsersRuntime(infra),
  };
}

export type ServerRuntime = ReturnType<typeof createServerRuntime>;

let cachedServerRuntime: ServerRuntime | undefined;

export function getServerRuntime(): ServerRuntime {
  cachedServerRuntime ??= createServerRuntime();
  return cachedServerRuntime;
}
