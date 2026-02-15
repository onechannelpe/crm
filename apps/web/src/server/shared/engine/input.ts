export function validateSearchInput(value: string, limit: number): void {
  if (!value.trim()) {
    throw new Error("Engine search value is required");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Engine search limit must be an integer between 1 and 100");
  }
}
