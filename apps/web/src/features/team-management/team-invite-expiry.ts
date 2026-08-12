import { appCalendarDateAt } from "~/domain/time/app-time";
import {
  addCalendarDays,
  parseCalendarDate,
  type CalendarDate,
} from "~/domain/time/calendar-date";

const MIN_INVITE_EXPIRY_DAYS = 7;

export const INVITE_EXPIRY_HELPER_TEXT =
  "Opcional. Debe vencer al menos 7 días después de hoy.";

const INVALID_INVITE_EXPIRY_ERROR_TEXT = "Ingresa una fecha válida.";

export const INVITE_EXPIRY_ERROR_TEXT =
  "Elige una fecha al menos 7 días después de hoy.";

export function parseInviteExpiryDate(
  value: string,
  now: number,
):
  | { isErr: false; value: CalendarDate | null }
  | { isErr: true; error: string } {
  if (!value) {
    return { isErr: false, value: null };
  }

  const expiresOn = parseCalendarDate(value);

  if (!expiresOn) {
    return { isErr: true, error: INVALID_INVITE_EXPIRY_ERROR_TEXT };
  }

  if (expiresOn < getMinInviteExpiryDate(now)) {
    return { isErr: true, error: INVITE_EXPIRY_ERROR_TEXT };
  }

  return { isErr: false, value: expiresOn };
}

export function getInviteExpiryFieldError(
  value: string,
  now: number,
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

export function getMinInviteExpiryDate(now: number): CalendarDate {
  return addCalendarDays(appCalendarDateAt(now), MIN_INVITE_EXPIRY_DAYS);
}
