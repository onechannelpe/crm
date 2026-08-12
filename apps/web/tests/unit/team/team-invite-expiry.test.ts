import { describe, expect, it } from "vitest";

import { appInstantAt } from "~/domain/time/app-time";
import { calendarDateFromParts } from "~/domain/time/calendar-date";
import {
  getInviteExpiryFieldError,
  getMinInviteExpiryDate,
  INVITE_EXPIRY_ERROR_TEXT,
  parseInviteExpiryDate,
} from "~/features/team-management/team-invite-expiry";

describe("team invite expiry helpers", () => {
  // Pin the fixture to the business calendar, not the host timezone.
  const fixedNow = appInstantAt(
    calendarDateFromParts({ year: 2026, month: 3, day: 24 }),
    12,
  ).getTime();

  it("computes the minimum selectable invite date", () => {
    expect(getMinInviteExpiryDate(fixedNow)).toBe("2026-03-31");
  });

  it("accepts an empty expiry value", () => {
    expect(parseInviteExpiryDate("", fixedNow)).toEqual({
      isErr: false,
      value: null,
    });
  });

  it("rejects malformed dates", () => {
    expect(parseInviteExpiryDate("2026-03", fixedNow)).toEqual({
      isErr: true,
      error: "Ingresa una fecha válida.",
    });

    expect(parseInviteExpiryDate("2026-02-31", fixedNow)).toEqual({
      isErr: true,
      error: "Ingresa una fecha válida.",
    });
  });

  it("rejects dates that are less than seven days ahead", () => {
    expect(parseInviteExpiryDate("2026-03-30", fixedNow)).toEqual({
      isErr: true,
      error: INVITE_EXPIRY_ERROR_TEXT,
    });
  });

  it("accepts a date at the end of the seventh day", () => {
    expect(parseInviteExpiryDate("2026-03-31", fixedNow)).toEqual({
      isErr: false,
      value: "2026-03-31",
    });
  });

  it("only shows inline field errors after a full date is present", () => {
    expect(getInviteExpiryFieldError("2026-03", fixedNow)).toBeUndefined();

    expect(getInviteExpiryFieldError("2026-03-30", fixedNow)).toBe(
      INVITE_EXPIRY_ERROR_TEXT,
    );
  });
});
