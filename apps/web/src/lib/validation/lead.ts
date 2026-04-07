export function normalizeLeadRucInput(value: string): string {
  return value.trim();
}

export function isValidLeadRucInput(value: string): boolean {
  return normalizeLeadRucInput(value).length > 0;
}
