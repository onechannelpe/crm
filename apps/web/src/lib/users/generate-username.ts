function normalizePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export async function generateUsername(
  names: string,
  firstSurname: string,
  secondSurname: string,
  exists: (username: string) => Promise<boolean>,
): Promise<string> {
  const first = normalizePart(names);
  const fs = normalizePart(firstSurname);
  const ss = normalizePart(secondSurname);

  const candidates = [
    `${first}.${fs}`,
    `${first}.${fs}.${ss}`,
    ...Array.from({ length: 98 }, (_, i) => `${first}.${fs}${i + 2}`),
  ];

  for (const candidate of candidates) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await exists(candidate))) return candidate;
  }

  // Fallback with timestamp suffix — should never be reached in practice
  return `${first}.${fs}.${Date.now()}`;
}
