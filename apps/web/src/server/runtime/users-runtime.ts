import { createUsersRepo } from "~/server/users/repos-users";

import type { ServerInfra } from "./infra";

export function createUsersRuntime(infra: ServerInfra) {
  return {
    users: createUsersRepo(infra.db),
  };
}
