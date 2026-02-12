import type { Contact } from "./types";
import { ContactCooldownError } from "../shared/errors";
import type { Result } from "../shared/result";
import { Ok, Err } from "../shared/result";

const DEFAULT_COOLDOWN_HOURS = 24;

export function isInCooldown(contact: Contact, now: number = Date.now()): boolean {
  if (!contact.cooldownUntil) {
    return false;
  }
  return now < contact.cooldownUntil;
}

export function canContactNow(
  contact: Contact,
  now: number = Date.now(),
): Result<void, ContactCooldownError> {
  if (isInCooldown(contact, now)) {
    return Err(new ContactCooldownError(contact.cooldownUntil!));
  }
  return Ok(undefined);
}

export function setCooldown(
  contact: Contact,
  hours: number = DEFAULT_COOLDOWN_HOURS,
  userId: number,
): Contact {
  const now = Date.now();
  return {
    ...contact,
    lastContactedAt: now,
    lastContactedByUserId: userId,
    cooldownUntil: now + hours * 60 * 60 * 1000,
  };
}
