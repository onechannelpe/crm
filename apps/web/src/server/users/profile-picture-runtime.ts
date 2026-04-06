import { config } from "~/lib/config";
import { db } from "~/lib/db/db";

import { createProfilePictureBlobStore } from "./profile-picture-blob-store";
import { createProfilePictureService } from "./profile-picture-service";
import { createUsersRepo } from "./repos-users";

const profilePictureService = createProfilePictureService(
  { users: createUsersRepo(db) },
  createProfilePictureBlobStore(config.uploads.storageRoot),
);

export function getProfilePictureRuntime() {
  return { profilePictureService };
}
