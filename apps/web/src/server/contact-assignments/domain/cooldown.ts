export type ContactCooldownSnapshot = {
  cooldown_until: Date | null;
};

function isInCooldown(contact: ContactCooldownSnapshot, now: Date): boolean {
  if (!contact.cooldown_until) return false;
  return now < contact.cooldown_until;
}

export function canContactNow(
  contact: ContactCooldownSnapshot,
  now: Date,
): boolean {
  return !isInCooldown(contact, now);
}
