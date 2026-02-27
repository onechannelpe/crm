import { action, json } from "@solidjs/router";

import { finishTotpEnrollment } from "~/actions/auth";
import { removeUserAvatar, uploadUserAvatar } from "~/actions/settings";
import { totpStatusQuery } from "~/lib/queries/profile";

export const finishTotpEnrollmentMutation = action(async (code: string) => {
  const codes = await finishTotpEnrollment(code);
  return json(codes, { revalidate: totpStatusQuery.key });
}, "finishTotpEnrollment");

export const uploadUserAvatarMutation = action(async (formData: FormData) => {
  return uploadUserAvatar(formData);
}, "uploadUserAvatar");

export const removeUserAvatarMutation = action(async () => {
  return removeUserAvatar();
}, "removeUserAvatar");
