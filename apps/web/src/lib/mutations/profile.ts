import { action, json } from "@solidjs/router";

import { finishTotpEnrollment } from "~/actions/auth";
import { totpStatusQuery } from "~/lib/queries/profile";

export const finishTotpEnrollmentMutation = action(async (code: string) => {
  const codes = await finishTotpEnrollment(code);
  return json(codes, { revalidate: totpStatusQuery.key });
}, "finishTotpEnrollment");
