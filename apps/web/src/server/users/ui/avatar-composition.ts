import { join } from "node:path";

import {
  serverInfrastructure as defaultServerInfrastructure,
  type ServerInfrastructure,
} from "~/server/platform/composition/infrastructure";
import {
  uploadsConfig,
  type UploadsConfig,
} from "~/server/platform/config/env";
import { createBlobStore } from "~/server/platform/files/blob-store";
import { createAvatarService } from "~/server/users/avatar-service";
import { createUsersRepo } from "~/server/users/repos-users";

export function createAvatarComposition(
  serverInfrastructure: ServerInfrastructure,
  config: UploadsConfig,
) {
  return {
    avatarService: createAvatarService(
      { users: createUsersRepo(serverInfrastructure.db) },
      createBlobStore(join(config.storageRoot, "avatars")),
    ),
  };
}

export function composeAvatar() {
  return createAvatarComposition(defaultServerInfrastructure, uploadsConfig());
}
