export function takeFromPool<T>(
  pool: T[],
  cursor: { value: number },
  errorMessage: string,
): T {
  const value = pool[cursor.value];
  cursor.value += 1;
  if (value === undefined) {
    throw new Error(errorMessage);
  }
  return value;
}
