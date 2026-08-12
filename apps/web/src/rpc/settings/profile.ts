import { fail } from "~/domain/errors";
import { parsePhone } from "~/domain/phone/pe-mobile";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
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
      if (isErr(shape)) return shape;

      const phone = parsePhone(shape.value.phone);
      if (!phone) return Err(fail("invalid_phone"));

      return Ok({ phone });
    },

    execute: async ({ actor, operationAt }, { phone }) => {
      const result = await getApplication().users.updatePhone(
        actor.userId,
        phone,
        operationAt,
      );
      if (isErr(result)) return Err(fail("phone_in_use"));

      return Ok({ message: "Perfil actualizado" });
    },
  });
}
