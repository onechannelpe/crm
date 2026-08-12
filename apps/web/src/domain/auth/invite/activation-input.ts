import { isValidInviteTokenFormat } from "~/domain/auth/invite/tokens";
import { fail, type DomainError } from "~/domain/errors";
import { Err, isErr, Ok, type Result } from "~/shared/result";
import { isPlainRecord } from "~/shared/type-guards";

export function readInviteToken(raw: unknown): Result<string, DomainError> {
  if (typeof raw !== "string") {
    return Err(fail("invite_token_malformed"));
  }

  const token = raw.trim();

  if (!token || !isValidInviteTokenFormat(token)) {
    return Err(fail("invite_token_malformed"));
  }

  return Ok(token);
}

function validateStrongPassword(raw: unknown): Result<string, DomainError> {
  if (typeof raw !== "string") {
    return Err(fail("invite_password_too_short"));
  }

  if (!raw.trim() || raw.length < 12) {
    return Err(fail("invite_password_too_short"));
  }

  if (!/[A-Z]/.test(raw)) {
    return Err(fail("invite_password_missing_uppercase"));
  }

  if (!/[a-z]/.test(raw)) {
    return Err(fail("invite_password_missing_lowercase"));
  }

  if (!/[0-9]/.test(raw)) {
    return Err(fail("invite_password_missing_number"));
  }

  return Ok(raw);
}

export function validateInviteAcceptance(
  input: unknown,
): Result<{ token: string; password: string }, DomainError> {
  if (!isPlainRecord(input)) {
    return Err(fail("invite_token_malformed"));
  }

  const token = readInviteToken(input.token);

  if (isErr(token)) {
    return Err(token.error);
  }

  const password = validateStrongPassword(input.password);

  if (isErr(password)) {
    return Err(password.error);
  }

  if (
    input.confirmPassword !== undefined &&
    (typeof input.confirmPassword !== "string" ||
      password.value !== input.confirmPassword)
  ) {
    return Err(fail("password_mismatch"));
  }

  return Ok({
    token: token.value,
    password: password.value,
  });
}
