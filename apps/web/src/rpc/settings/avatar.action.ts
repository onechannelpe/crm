import { fail, type DomainError } from "~/domain/errors";
import { executeSessionServerFunction } from "~/server/platform/action";
import { toAvatarDomainError } from "~/server/users/avatar-error";
import { composeAvatar } from "~/server/users/ui/avatar-composition";
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
      const { avatarService } = composeAvatar();
      const result = await avatarService.upload(ctx.actor.userId, file);
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
      const { avatarService } = composeAvatar();
      const result = await avatarService.remove(ctx.actor.userId);
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
