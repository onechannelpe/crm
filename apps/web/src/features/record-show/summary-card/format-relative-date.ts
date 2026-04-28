const DAY_MS = 1000 * 60 * 60 * 24;

export function formatRelativeDate(
  timestamp: number,
  now = Date.now(),
): string {
  const diff = Math.max(0, now - timestamp);
  const days = Math.floor(diff / DAY_MS);
  if (days === 0) return "hoy";
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months === 1) return "hace 1 mes";
  if (months < 12) return `hace ${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? "hace 1 año" : `hace ${years} años`;
}
