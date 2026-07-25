"use server";

import { fail } from "~/domain/errors";
import { parsePhone } from "~/domain/phone/pe-mobile";
import { runAction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getServerRuntime } from "~/server/platform/container";
import { Err, isErr, Ok } from "~/shared/result";

export async function updateUserProfile(
  rawPhone: unknown,
): Promise<{ message: string }> {
  return runAction({
    name: "settings.profile.update_phone",
    access: { kind: "session" },

    parse: () => {
      const shape = parseObject({ phone: rawPhone }, validationFail, (r) => ({
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

    execute: async (ctx, command) => {
      const result = await getServerRuntime().users.updatePhone(
        ctx.actor.userId,
        command.phone,
      );

      if (isErr(result)) {
        return Err(fail("phone_in_use"));
      }

      return Ok({ message: "Perfil actualizado" });
    },
  });
}
