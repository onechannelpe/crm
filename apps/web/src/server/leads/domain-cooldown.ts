import type { Contact } from "~/lib/db/schema";

export function isInCooldown(contact: Contact, now: number = Date.now()): boolean {
    if (!contact.cooldown_until) return false;
    return now < contact.cooldown_until;
}

export function canContactNow(contact: Contact, now: number = Date.now()): boolean {
    return !isInCooldown(contact, now);
}

export function computeCooldownUntil(hours: number, now: number = Date.now()): number {
    return now + hours * 60 * 60 * 1000;
}
