let uuidCounter = 0n;

export function randomUUIDv7(): string {
  uuidCounter += 1n;
  return `00000000-0000-7000-8000-${uuidCounter.toString(16).padStart(12, "0")}`;
}
