import { createAuthRuntime } from "./auth-runtime";
import { createServerInfra } from "./infra";
import { createPipelineRuntime } from "./pipeline-runtime";
import { createSalesRuntime } from "./sales-runtime";

export function createServerRuntime() {
  const infra = createServerInfra();

  return {
    infra,
    auth: createAuthRuntime(infra),
    pipeline: createPipelineRuntime(infra),
    sales: createSalesRuntime(infra),
  };
}

export const serverRuntime = createServerRuntime();
