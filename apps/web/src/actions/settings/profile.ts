"use server";

import type { ActionSuccess } from "~/contracts/common";
import { parsePhone } from "~/lib/phone/pe-mobile";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { domainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, isErr, Ok } from "~/server/shared/result";

export async function updateUserProfile(phone: unknown): Promise<ActionSuccess> {
  return runAction({
    actionName: "settings.profile.update_phone",
    access: { kind: "session" },
    // Normalize and validate the phone at the boundary so the command receives
    // a canonical local number.
    parse: () => {
      const shape = parseObject({ phone }, validationFail, (r) => ({
        phone: r.str("phone"),
      }));
      if (isErr(shape)) return shape;
      const localPhone = parsePhone(shape.value.phone);
      if (!localPhone) {
        return Err(
          domainError(
            "validation",
            "invalid_phone",
            "El número debe tener 9 dígitos y empezar con 9",
          ),
        );
      }
      return Ok({ phone: localPhone });
    },
    execute: async (ctx, input) => {
      const result = await getServerRuntime().users.updatePhone(
        ctx.actor.userId,
        input.phone,
      );
      if (isErr(result)) {
        return Err(
          domainError(
            "conflict",
            "phone_in_use",
            "Este número de WhatsApp ya está en uso",
          ),
        );
      }
      return Ok({ success: true });
    },
  });
}
