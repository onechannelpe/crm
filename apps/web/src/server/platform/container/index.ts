import {
  appConfig,
  engineConfig,
  notificationsConfig,
  uploadsConfig,
} from "~/lib/env";
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

function memo<T>(build: () => T): () => T {
  let cached: { value: T } | undefined;
  return () => {
    cached ??= { value: build() };
    return cached.value;
  };
}

function createServerRuntime() {
  const infra = createServerInfra();

  const engine = memo(() => createDefaultEngineClient(engineConfig()));
  const notifications = memo(() =>
    createNotificationsRuntime(infra, notificationsConfig(), appConfig()),
  );
  const files = memo(() => createFilesRuntime(infra, uploadsConfig()));
  const admin = memo(() => createAdminRuntime(infra));
  const auth = memo(() => createAuthRuntime(infra, notifications()));
  const capacity = memo(() => createCapacityRuntime(infra));
  const clientSearch = memo(() => createClientSearchRuntime(infra, engine()));
  const contactAssignments = memo(() =>
    createContactAssignmentsRuntime(infra, engine()),
  );
  const extension = memo(() => createExtensionRuntime(infra));
  const integrations = memo(() => createIntegrationsRuntime(infra));
  const observability = memo(() => createObservabilityRuntime(infra));
  const workflow = memo(() => createWorkflowRuntime(infra, engine(), files()));
  const profilePicture = memo(() =>
    createProfilePictureRuntime(infra, uploadsConfig()),
  );
  const security = memo(() => createSecurityRuntime(infra));
  const search = memo(() => createSearchRuntime(infra));
  const team = memo(() => createTeamRuntime(infra));
  const users = memo(() => createUsersRuntime(infra));

  return {
    infra,
    get engine() {
      return engine();
    },
    get admin() {
      return admin();
    },
    get files() {
      return files();
    },
    get auth() {
      return auth();
    },
    get capacity() {
      return capacity();
    },
    get clientSearch() {
      return clientSearch();
    },
    get contactAssignments() {
      return contactAssignments();
    },
    get extension() {
      return extension();
    },
    get integrations() {
      return integrations();
    },
    get notifications() {
      return notifications();
    },
    get observability() {
      return observability();
    },
    get workflow() {
      return workflow();
    },
    get profilePicture() {
      return profilePicture();
    },
    get security() {
      return security();
    },
    get search() {
      return search();
    },
    get team() {
      return team();
    },
    get users() {
      return users();
    },
  };
}

export type ServerRuntime = ReturnType<typeof createServerRuntime>;

let cachedServerRuntime: ServerRuntime | undefined;

export function getServerRuntime(): ServerRuntime {
  cachedServerRuntime ??= createServerRuntime();
  return cachedServerRuntime;
}
