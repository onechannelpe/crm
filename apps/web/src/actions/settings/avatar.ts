"use server";

import { requireSession } from "~/lib/auth/access/session";
import { getServerRuntime } from "~/server/runtime";
import {
  external,
  fail,
  invalid,
  throwDomain,
} from "~/server/shared/domain-error";
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
  const session = await requireSession();
  const { profilePictureService } = getServerRuntime().profilePicture;
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throwDomain(fail("profile_picture_required"));
  }

  const result = await profilePictureService.upload(session.userId, file);
  if (!result.ok) {
    if (isValidationAvatarError(result.error.code)) {
      throwDomain(invalid({ code: result.error.code }));
    }
    throwDomain(
      external(avatarExternalMessage(result.error.code), {
        code: result.error.code,
      }),
    );
  }

  return {
    avatarVersion: result.value.avatarVersion,
    avatarUrl: avatarUrl(result.value.avatarVersion),
    message: "Foto de perfil actualizada",
  };
}

export async function removeUserAvatar(): Promise<RemoveAvatarResult> {
  const session = await requireSession();
  const { profilePictureService } = getServerRuntime().profilePicture;
  const result = await profilePictureService.remove(session.userId);

  if (!result.ok) {
    if (isValidationAvatarError(result.error.code)) {
      throwDomain(invalid({ code: result.error.code }));
    }
    throwDomain(
      external(avatarExternalMessage(result.error.code), {
        code: result.error.code,
      }),
    );
  }

  return {
    avatarVersion: result.value.avatarVersion,
    avatarUrl: null,
    message: "Foto de perfil eliminada",
  };
}
