import { createAuthRuntime } from "./auth-runtime";
import { createClientSearchRuntime } from "./client-search-runtime";
import { createExtensionRuntime } from "./extension-runtime";
import { createServerInfra } from "./infra";
import { createNotificationsRuntime } from "./notifications-runtime";
import { createObservabilityRuntime } from "./observability-runtime";
import { createPipelineRuntime } from "./pipeline-runtime";
import { createProfilePictureRuntime } from "./profile-picture-runtime";
import { createSalesRuntime } from "./sales-runtime";
import { createSecurityRuntime } from "./security-runtime";

export function createServerRuntime() {
  const infra = createServerInfra();

  return {
    infra,
    auth: createAuthRuntime(infra),
    clientSearch: createClientSearchRuntime(infra),
    extension: createExtensionRuntime(infra),
    notifications: createNotificationsRuntime(),
    observability: createObservabilityRuntime(infra),
    pipeline: createPipelineRuntime(infra),
    profilePicture: createProfilePictureRuntime(infra),
    security: createSecurityRuntime(infra),
    sales: createSalesRuntime(infra),
  };
}

export const serverRuntime = createServerRuntime();
