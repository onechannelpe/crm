"use server";

import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { UserId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

export async function uploadMemberAvatar(
  formData: FormData,
): Promise<{ message: string }> {
  return runAction({
    name: "members.avatar.upload",
    access: { kind: "permission", permission: "team:manage" },

    parse: (): Result<{ userId: UserId; file: File }, DomainError> => {
      const parsedId = parseObject(
        { userId: formData.get("userId") },
        validationFail,
        (r) => ({ userId: r.id("userId", UserId) }),
      );
      if (isErr(parsedId)) return parsedId;

      const file = formData.get("file");
      if (!(file instanceof File)) {
        return Err(fail("profile_picture_required"));
      }
      return Ok({ userId: parsedId.value.userId, file });
    },

    audit: (command) => ({ userId: command.userId }),

    execute: async (ctx, command) => {
      const result = await getServerRuntime().users.members.uploadAvatar(
        ctx,
        command,
      );
      if (isErr(result)) return result;
      return Ok({ message: "Foto de perfil actualizada" });
    },
  });
}

export async function removeMemberAvatar(
  rawUserId: unknown,
): Promise<{ message: string }> {
  return runAction({
    name: "members.avatar.remove",
    access: { kind: "permission", permission: "team:manage" },

    parse: () =>
      parseObject({ userId: rawUserId }, validationFail, (r) => ({
        userId: r.id("userId", UserId),
      })),

    audit: (command) => ({ userId: command.userId }),

    execute: async (ctx, command) => {
      const result = await getServerRuntime().users.members.removeAvatar(
        ctx,
        command,
      );
      if (isErr(result)) return result;
      return Ok({ message: "Foto de perfil eliminada" });
    },
  });
}
