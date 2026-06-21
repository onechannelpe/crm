export type ContactCooldownSnapshot = {
  cooldown_until: number | null;
};

function isInCooldown(
  contact: ContactCooldownSnapshot,
  now: number = Date.now(),
): boolean {
  if (!contact.cooldown_until) return false;
  return now < contact.cooldown_until;
}

export function canContactNow(
  contact: ContactCooldownSnapshot,
  now: number = Date.now(),
): boolean {
  return !isInCooldown(contact, now);
}
