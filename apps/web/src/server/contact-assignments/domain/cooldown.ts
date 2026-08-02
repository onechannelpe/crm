export type ContactCooldownSnapshot = {
  cooldown_until: Date | null;
};

function isInCooldown(
  contact: ContactCooldownSnapshot,
  availableAsOf: Date,
): boolean {
  if (!contact.cooldown_until) return false;
  return availableAsOf < contact.cooldown_until;
}

export function canContactNow(
  contact: ContactCooldownSnapshot,
  availableAsOf: Date,
): boolean {
  return !isInCooldown(contact, availableAsOf);
}
