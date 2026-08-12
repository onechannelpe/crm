export function saleIdentityKey(
  merchantId: string,
  product: string,
  serialNumber: string | null,
): string {
  return JSON.stringify([merchantId, product, serialNumber ?? ""]);
}
