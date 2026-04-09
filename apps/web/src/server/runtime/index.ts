import { createAuthRuntime } from "./auth-runtime";
import { createExtensionRuntime } from "./extension-runtime";
import { createServerInfra } from "./infra";
import { createPipelineRuntime } from "./pipeline-runtime";
import { createProfilePictureRuntime } from "./profile-picture-runtime";
import { createSalesRuntime } from "./sales-runtime";
import { createSecurityRuntime } from "./security-runtime";

export function createServerRuntime() {
  const infra = createServerInfra();

  return {
    infra,
    auth: createAuthRuntime(infra),
    extension: createExtensionRuntime(infra),
    pipeline: createPipelineRuntime(infra),
    profilePicture: createProfilePictureRuntime(infra),
    security: createSecurityRuntime(infra),
    sales: createSalesRuntime(infra),
  };
}

export const serverRuntime = createServerRuntime();
