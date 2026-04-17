/**
 * Brand utility using a unique symbol key.
 *
 * The symbol is unique per compilation unit, which means two brands with the
 * same name string from different modules are still distinct types.
 *
 * Usage:
 *   export type LeadId = Brand<string, "LeadId">;
 *   export const asLeadId = (id: string): LeadId => id as LeadId;
 */
declare const BRAND: unique symbol;

export type Brand<T, Name extends string> = T & {
  readonly [BRAND]: Name;
};

/**
 * Casts a value to a branded type.
 *
 * Only call this at a trusted data boundary (server response, DB result,
 * validated domain entry-point). Never call inside business logic.
 */
export function brand<T, Name extends string>(value: T): Brand<T, Name> {
  // oxlint-disable-next-line typescript-eslint(no-unsafe-type-assertion)
  return value as Brand<T, Name>;
}
