"use server";

import { internalError, validationError } from "~/lib/app-errors";
import { requireSession } from "~/lib/auth/access/session";
import { profilePictureService } from "~/server/shared/context";

function mapAvatarErrorToMessage(code: string): string {
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
    default:
      return "Failed to update profile picture.";
  }
}

function isValidationAvatarError(code: string): boolean {
  return (
    code === "invalid_file" ||
    code === "too_large" ||
    code === "unsupported_mime" ||
    code === "avatar_not_found" ||
    code === "user_not_found"
  );
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
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw validationError("Missing profile picture file.");
  }

  const result = await profilePictureService.upload(session.userId, file);
  if (!result.ok) {
    const message = mapAvatarErrorToMessage(result.error.code);
    if (isValidationAvatarError(result.error.code)) {
      throw validationError(message);
    }
    throw internalError(message);
  }

  return {
    avatarVersion: result.value.avatarVersion,
    avatarUrl: avatarUrl(result.value.avatarVersion),
  };
}

export async function removeUserAvatar(): Promise<RemoveAvatarResult> {
  const session = await requireSession();
  const result = await profilePictureService.remove(session.userId);

  if (!result.ok) {
    const message = mapAvatarErrorToMessage(result.error.code);
    if (isValidationAvatarError(result.error.code)) {
      throw validationError(message);
    }
    throw internalError(message);
  }

  return {
    avatarVersion: result.value.avatarVersion,
    avatarUrl: null,
  };
}
