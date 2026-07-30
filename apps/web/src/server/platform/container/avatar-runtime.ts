import { join } from "node:path";

import {
  uploadsConfig,
  type UploadsConfig,
} from "~/server/platform/config/env";
import { createBlobStore } from "~/server/platform/files/blob-store";
import { createAvatarService } from "~/server/users/avatar-service";
import { createUsersRepo } from "~/server/users/repos-users";

import { infra, type ServerInfra } from "./infra";
import { memo } from "./memo";

export function createAvatarRuntime(infra: ServerInfra, config: UploadsConfig) {
  return {
    avatarService: createAvatarService(
      { users: createUsersRepo(infra.db) },
      createBlobStore(join(config.storageRoot, "avatars")),
    ),
  };
}

export const getAvatarRuntime = memo(() =>
  createAvatarRuntime(infra, uploadsConfig()),
);
