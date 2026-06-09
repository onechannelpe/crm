"use server";

import type { ActionSuccess } from "~/contracts/common";
import { parsePhone } from "~/lib/phone/pe-mobile";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { fail } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, isErr, Ok } from "~/server/shared/result";

export async function updateUserProfile(
  phone: unknown,
): Promise<ActionSuccess> {
  return runAction({
    name: "settings.profile.update_phone",
    access: { kind: "session" },

    parse: () => {
      const shape = parseObject({ phone }, validationFail, (r) => ({
        phone: r.str("phone"),
      }));

      if (isErr(shape)) {
        return shape;
      }

      const localPhone = parsePhone(shape.value.phone);

      if (!localPhone) {
        return Err(fail("invalid_phone"));
      }

      return Ok({ phone: localPhone });
    },

    execute: async (ctx, { phone }) => {
      const result = await getServerRuntime().users.updatePhone(
        ctx.actor.userId,
        phone,
      );

      if (isErr(result)) {
        return Err(fail("phone_in_use"));
      }

      return Ok({ success: true });
    },
  });
}
