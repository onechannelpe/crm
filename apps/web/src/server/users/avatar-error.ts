import { external, invalid, type DomainError } from "~/domain/errors";
import type { AvatarDomainErrorCode } from "~/server/users/avatar-service";

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

// Codes the caller can fix (file shape, size, mime) become validation; the rest
// is reported upstream with a generic client message.
export function toAvatarDomainError(code: AvatarDomainErrorCode): DomainError {
  if (isValidationAvatarError(code)) {
    return invalid({ code });
  }
  return external(avatarExternalMessage(code), { code });
}
