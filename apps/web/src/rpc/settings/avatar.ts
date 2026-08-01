import { fail, type DomainError } from "~/domain/errors";
import { executeSessionServerFunction } from "~/server/platform/action";
import { application } from "~/server/platform/composition/application";
import { toAvatarDomainError } from "~/server/users/avatar-error";
import { Err, Ok, isErr, type Result } from "~/shared/result";

function avatarUrl(version: number): string {
  return `/api/me/avatar?v=${version}`;
}

export interface UpdateAvatarResult {
  avatarVersion: number;
  avatarUrl: string;
  message: string;
}

export interface RemoveAvatarResult {
  avatarVersion: number;
  avatarUrl: null;
  message: string;
}

export async function uploadUserAvatar(
  formData: FormData,
): Promise<UpdateAvatarResult> {
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

    execute: async (ctx, file) => {
      const result = await application.avatar.upload(
        ctx.actor.userId,
        file,
        ctx.operationAt,
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

export async function removeUserAvatar(): Promise<RemoveAvatarResult> {
  "use server";

  return executeSessionServerFunction({
    name: "settings.avatar.remove",
    access: { kind: "session" },

    execute: async (ctx) => {
      const result = await application.avatar.remove(
        ctx.actor.userId,
        ctx.operationAt,
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
