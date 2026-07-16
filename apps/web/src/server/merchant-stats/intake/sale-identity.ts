// NUL cannot appear in a source cell, so identity fields cannot collide when joined.
const KEY_SEPARATOR = "\u0000";

export function saleIdentityKey(
  merchantId: string,
  product: string,
  serialNumber: string | null,
): string {
  return [merchantId, product, serialNumber ?? ""].join(KEY_SEPARATOR);
}
