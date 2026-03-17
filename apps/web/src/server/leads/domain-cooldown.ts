import type { Contact } from "~/lib/db/types";

type WithCooldown = Pick<Contact, "cooldown_until">;

export function isInCooldown(
  contact: WithCooldown,
  now: number = Date.now(),
): boolean {
  if (!contact.cooldown_until) return false;
  return now < contact.cooldown_until;
}

export function canContactNow(
  contact: WithCooldown,
  now: number = Date.now(),
): boolean {
  return !isInCooldown(contact, now);
}

export function computeCooldownUntil(
  hours: number,
  now: number = Date.now(),
): number {
  return now + hours * 60 * 60 * 1000;
}
