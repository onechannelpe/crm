"use server";

import { requireSession } from "~/lib/auth/access/session";
import { getServerRuntime } from "~/server/runtime";
import { internalFault, validationFault } from "~/server/shared/domain-error";
import type { AvatarDomainErrorCode } from "~/server/users/profile-picture-service";

function mapAvatarErrorToMessage(code: AvatarDomainErrorCode): string {
  switch (code) {
    case "invalid_file":
      return "Profile picture file is invalid.";
    case "too_large":
      return "Profile picture must be 10MB or less.";
    case "unsupported_mime":
      return "Only PNG, JPEG, and GIF are supported.";
    case "avatar_not_found":
      return "Profile picture not found.";
    case "user_not_found":
      return "User not found.";
    case "storage_unavailable":
    case "repository_unavailable":
      return "Profile picture service is unavailable.";
  }

  const exhaustiveCheck: never = code;
  return exhaustiveCheck;
}

function isValidationAvatarError(code: AvatarDomainErrorCode): boolean {
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
}

export interface RemoveAvatarResult {
  avatarVersion: number;
  avatarUrl: null;
}

export async function uploadUserAvatar(
  formData: FormData,
): Promise<UpdateAvatarResult> {
  const session = await requireSession();
  const { profilePictureService } = getServerRuntime().profilePicture;
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw validationFault("Missing profile picture file.");
  }

  const result = await profilePictureService.upload(session.userId, file);
  if (!result.ok) {
    const message = mapAvatarErrorToMessage(result.error.code);
    if (isValidationAvatarError(result.error.code)) {
      throw validationFault(message);
    }
    throw internalFault(message);
  }

  return {
    avatarVersion: result.value.avatarVersion,
    avatarUrl: avatarUrl(result.value.avatarVersion),
  };
}

export async function removeUserAvatar(): Promise<RemoveAvatarResult> {
  const session = await requireSession();
  const { profilePictureService } = getServerRuntime().profilePicture;
  const result = await profilePictureService.remove(session.userId);

  if (!result.ok) {
    const message = mapAvatarErrorToMessage(result.error.code);
    if (isValidationAvatarError(result.error.code)) {
      throw validationFault(message);
    }
    throw internalFault(message);
  }

  return {
    avatarVersion: result.value.avatarVersion,
    avatarUrl: null,
  };
}
