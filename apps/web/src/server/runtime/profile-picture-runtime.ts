import { config } from "~/lib/config";
import { createProfilePictureBlobStore } from "~/server/users/profile-picture-blob-store";
import { createProfilePictureService } from "~/server/users/profile-picture-service";
import { createUsersRepo } from "~/server/users/repos-users";

import type { ServerInfra } from "./infra";

export function createProfilePictureRuntime(infra: ServerInfra) {
  return {
    profilePictureService: createProfilePictureService(
      { users: createUsersRepo(infra.db) },
      createProfilePictureBlobStore(config.uploads.storageRoot),
    ),
  };
}
