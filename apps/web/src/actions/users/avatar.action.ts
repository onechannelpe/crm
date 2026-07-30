import { fail, type DomainError } from "~/domain/errors";
import { UserId } from "~/domain/ids";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { getUsersRuntime } from "~/server/platform/container/users-runtime";
import { Err, isErr, Ok, type Result } from "~/shared/result";

export async function uploadMemberAvatar(
  formData: FormData,
): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
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
      const result = await getUsersRuntime().members.uploadAvatar(ctx, command);
      if (isErr(result)) return result;
      return Ok({ message: "Foto de perfil actualizada" });
    },
  });
}

export async function removeMemberAvatar(
  rawUserId: unknown,
): Promise<{ message: string }> {
  "use server";

  return executeSessionServerFunction({
    name: "members.avatar.remove",
    access: { kind: "permission", permission: "team:manage" },

    parse: () =>
      parseObject({ userId: rawUserId }, validationFail, (r) => ({
        userId: r.id("userId", UserId),
      })),

    audit: (command) => ({ userId: command.userId }),

    execute: async (ctx, command) => {
      const result = await getUsersRuntime().members.removeAvatar(ctx, command);
      if (isErr(result)) return result;
      return Ok({ message: "Foto de perfil eliminada" });
    },
  });
}
