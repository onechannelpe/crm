// Domain error fields are spread flat because the logger only unwraps Error
// values at the top level of the meta object.
export function faultMeta(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return { error };
  }

  if (error === null || typeof error !== "object") {
    return { error: String(error) };
  }

  return Object.fromEntries(Object.entries(error));
}
