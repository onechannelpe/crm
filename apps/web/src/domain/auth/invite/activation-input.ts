import { isValidInviteTokenFormat } from "~/domain/auth/invite/tokens";
import { fail, type DomainError } from "~/domain/errors";
import { Err, isErr, Ok, type Result } from "~/shared/result";

export type InviteAcceptanceInput = {
  token: string;
  password: string;
  confirmPassword?: string;
};

export function readInviteToken(raw: string): Result<string, DomainError> {
  const token = raw.trim();
  if (!token || !isValidInviteTokenFormat(token)) {
    return Err(fail("invite_token_malformed"));
  }
  return Ok(token);
}

function readStrongPassword(raw: string): Result<string, DomainError> {
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
  input: InviteAcceptanceInput,
): Result<{ token: string; password: string }, DomainError> {
  if (
    input.confirmPassword !== undefined &&
    input.password !== input.confirmPassword
  ) {
    return Err(fail("password_mismatch"));
  }

  const token = readInviteToken(input.token);
  if (isErr(token)) return Err(token.error);

  const password = readStrongPassword(input.password);
  if (isErr(password)) return Err(password.error);

  return Ok({ token: token.value, password: password.value });
}
