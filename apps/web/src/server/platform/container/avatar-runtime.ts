import { join } from "node:path";

import type { UploadsConfig } from "~/lib/env";
import { createBlobStore } from "~/server/shared/blob-store";
import { createAvatarService } from "~/server/users/avatar-service";
import { createUsersRepo } from "~/server/users/repos-users";

import type { ServerInfra } from "./infra";

export function createAvatarRuntime(infra: ServerInfra, config: UploadsConfig) {
  return {
    avatarService: createAvatarService(
      { users: createUsersRepo(infra.db) },
      createBlobStore(join(config.storageRoot, "avatars")),
    ),
  };
}
