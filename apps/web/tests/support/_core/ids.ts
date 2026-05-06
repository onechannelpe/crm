export function createDeterministicIdFactory(prefix: string) {
  let value = 0;
  return {
    next(suffix = ""): string {
      value += 1;
      const tail = suffix.length > 0 ? `-${suffix}` : "";
      return `${prefix}-${value}${tail}`;
    },
  };
}
