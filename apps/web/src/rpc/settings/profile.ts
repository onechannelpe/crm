import { fail } from "~/domain/errors";
import { parsePhone } from "~/domain/phone/pe-mobile";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { composeUsers } from "~/server/users/ui/composition";
import { Err, isErr, Ok } from "~/shared/result";

export async function updateUserProfile(
  rawPhone: unknown,
): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
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
      const result = await composeUsers().updatePhone(
        ctx.actor.userId,
        command.phone,
        ctx.operationAt,
      );

      if (isErr(result)) {
        return Err(fail("phone_in_use"));
      }

      return Ok({ message: "Perfil actualizado" });
    },
  });
}
