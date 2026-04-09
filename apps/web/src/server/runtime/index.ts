import { createAuthRuntime } from "./auth-runtime";
import { createServerInfra } from "./infra";

export function createServerRuntime() {
  const infra = createServerInfra();

  return {
    infra,
    auth: createAuthRuntime(infra),
  };
}

export const serverRuntime = createServerRuntime();
