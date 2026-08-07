import { fail, type DomainError } from "~/domain/errors";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import { toAvatarDomainError } from "~/server/users/avatar-error";
import { Err, Ok, isErr, type Result } from "~/shared/result";

function avatarUrl(version: number): string {
  return `/api/me/avatar?v=${version}`;
}

export async function uploadUserAvatar(formData: FormData): Promise<{
  avatarVersion: number;
  avatarUrl: string;
  message: string;
}> {
  "use server";

  return executeSessionServerFunction({
    name: "settings.avatar.upload",
    access: { kind: "session" },

    parse: (): Result<File, DomainError> => {
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return Err(fail("profile_picture_required"));
      }

      return Ok(file);
    },

    execute: async ({ actor, operationAt }, file) => {
      const result = await application.users.avatars.upload(
        actor.userId,
        file,
        operationAt,
      );

      if (isErr(result)) {
        return Err(toAvatarDomainError(result.error.code));
      }

      return Ok({
        avatarVersion: result.value.avatarVersion,
        avatarUrl: avatarUrl(result.value.avatarVersion),
        message: "Foto de perfil actualizada",
      });
    },
  });
}

export async function removeUserAvatar(): Promise<{
  avatarVersion: number;
  avatarUrl: null;
  message: string;
}> {
  "use server";

  return executeSessionServerFunction({
    name: "settings.avatar.remove",
    access: { kind: "session" },

    execute: async ({ actor, operationAt }) => {
      const result = await application.users.avatars.remove(
        actor.userId,
        operationAt,
      );

      if (isErr(result)) {
        return Err(toAvatarDomainError(result.error.code));
      }

      return Ok({
        avatarVersion: result.value.avatarVersion,
        avatarUrl: null,
        message: "Foto de perfil eliminada",
      });
    },
  });
}
