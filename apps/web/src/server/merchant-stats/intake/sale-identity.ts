// The durable sale identity, matching the (merchant_id, product,
// coalesce(serial_number,'')) unique index. Used to map upsert results back to
// their source rows and to dedupe a batch before the multi-row upsert.
//
// NUL is the separator: no source cell carries one, so an id cannot
// accidentally contain it. A printable separator would let a merchant id or
// product holding that character collide with a different identity.
const KEY_SEPARATOR = "\u0000";

export function saleIdentityKey(
  merchantId: string,
  product: string,
  serialNumber: string | null,
): string {
  return [merchantId, product, serialNumber ?? ""].join(KEY_SEPARATOR);
}
