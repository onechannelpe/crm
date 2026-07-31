import { action, json } from "@solidjs/router";

import { meQuery } from "~/rpc/auth/me.query";
import {
  removeUserAvatar,
  uploadUserAvatar,
} from "~/rpc/settings/avatar.action";
import { updateUserProfile } from "~/rpc/settings/profile.action";

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
