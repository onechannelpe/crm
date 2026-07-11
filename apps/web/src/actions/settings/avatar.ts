"use server";

import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import {
  external,
  fail,
  invalid,
  type DomainError,
} from "~/server/shared/domain-error";
import { Err, Ok, isErr, type Result } from "~/server/shared/result";
import type { AvatarDomainErrorCode } from "~/server/users/profile-picture-service";

type ValidationAvatarErrorCode = Extract<
  AvatarDomainErrorCode,
  | "invalid_file"
  | "too_large"
  | "unsupported_mime"
  | "avatar_not_found"
  | "user_not_found"
>;
type ExternalAvatarErrorCode = Exclude<
  AvatarDomainErrorCode,
  ValidationAvatarErrorCode
>;

function avatarExternalMessage(code: ExternalAvatarErrorCode): string {
  switch (code) {
    case "storage_unavailable":
    case "repository_unavailable":
      return "Profile picture service is unavailable.";
  }

  const exhaustiveCheck: never = code;
  return exhaustiveCheck;
}

function isValidationAvatarError(
  code: AvatarDomainErrorCode,
): code is ValidationAvatarErrorCode {
  switch (code) {
    case "invalid_file":
    case "too_large":
    case "unsupported_mime":
    case "avatar_not_found":
    case "user_not_found":
      return true;
    case "storage_unavailable":
    case "repository_unavailable":
      return false;
  }

  const exhaustiveCheck: never = code;
  return exhaustiveCheck;
}

// Codes the caller can fix (file shape, size, mime) become validation; the
// rest is reported upstream with a generic client message.
function toAvatarDomainError(code: AvatarDomainErrorCode): DomainError {
  if (isValidationAvatarError(code)) {
    return invalid({ code });
  }
  return external(avatarExternalMessage(code), { code });
}

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
  return runAction({
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
      const { profilePictureService } = getServerRuntime().profilePicture;
      const result = await profilePictureService.upload(ctx.actor.userId, file);
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
  return runAction({
    name: "settings.avatar.remove",
    access: { kind: "session" },

    execute: async (ctx) => {
      const { profilePictureService } = getServerRuntime().profilePicture;
      const result = await profilePictureService.remove(ctx.actor.userId);
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
