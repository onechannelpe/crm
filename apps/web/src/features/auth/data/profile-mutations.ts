import { action, json } from "@solidjs/router";

import {
  removeUserAvatar,
  uploadUserAvatar,
} from "~/actions/settings/avatar.action";
import { updateUserProfile } from "~/actions/settings/profile.action";
import { meQuery } from "~/features/auth/data/queries/me.query";

export const updateUserProfileMutation = action(
  async (phone: string) =>
    json(await updateUserProfile(phone), { revalidate: [meQuery.key] }),
  "updateUserProfile",
);

export const uploadUserAvatarMutation = action(async (formData: FormData) => {
  return uploadUserAvatar(formData);
}, "uploadUserAvatar");

export const removeUserAvatarMutation = action(async () => {
  return removeUserAvatar();
}, "removeUserAvatar");
