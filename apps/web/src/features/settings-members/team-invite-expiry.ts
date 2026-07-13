const MIN_INVITE_EXPIRY_DAYS = 7;
const INVITE_EXPIRY_HELPER_TEXT =
  "Opcional. Debe vencer al menos 7 días después de hoy.";
const INVALID_INVITE_EXPIRY_ERROR_TEXT = "Ingresa una fecha válida.";
const INVITE_EXPIRY_ERROR_TEXT =
  "Elige una fecha al menos 7 días después de hoy.";

export function parseInviteExpiryDate(
  value: string,
  now = Date.now(),
): { isErr: false; value: number | null } | { isErr: true; error: string } {
  if (!value) {
    return { isErr: false, value: null };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { isErr: true, error: INVALID_INVITE_EXPIRY_ERROR_TEXT };
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return { isErr: true, error: INVALID_INVITE_EXPIRY_ERROR_TEXT };
  }

  const localEndOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);
  if (Number.isNaN(localEndOfDay.getTime())) {
    return { isErr: true, error: INVALID_INVITE_EXPIRY_ERROR_TEXT };
  }

  if (
    localEndOfDay.getFullYear() !== year ||
    localEndOfDay.getMonth() !== month - 1 ||
    localEndOfDay.getDate() !== day
  ) {
    return { isErr: true, error: INVALID_INVITE_EXPIRY_ERROR_TEXT };
  }

  if (localEndOfDay.getTime() <= now + getInviteExpiryOffsetMs()) {
    return { isErr: true, error: INVITE_EXPIRY_ERROR_TEXT };
  }

  return { isErr: false, value: localEndOfDay.getTime() };
}

export function getInviteExpiryFieldError(
  value: string,
  now = Date.now(),
): string | undefined {
  if (!value) {
    return undefined;
  }

  if (value.length < 10) {
    return undefined;
  }

  const validation = parseInviteExpiryDate(value, now);
  return validation.isErr ? validation.error : undefined;
}

export function getMinInviteExpiryDate(now = new Date()): string {
  const minDate = new Date(now);
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(minDate.getDate() + MIN_INVITE_EXPIRY_DAYS);
  return `${minDate.getFullYear()}-${String(minDate.getMonth() + 1).padStart(2, "0")}-${String(minDate.getDate()).padStart(2, "0")}`;
}

function getInviteExpiryOffsetMs(): number {
  return MIN_INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
}

export {
  INVALID_INVITE_EXPIRY_ERROR_TEXT,
  INVITE_EXPIRY_ERROR_TEXT,
  INVITE_EXPIRY_HELPER_TEXT,
};
