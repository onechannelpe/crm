export function sanitizeMessageToRenderInSnackbar(
  input: unknown,
): string | null {
  if (input === null || input === undefined) {
    return null;
  }
  if (
    typeof input === "string" ||
    typeof input === "number" ||
    typeof input === "boolean"
  ) {
    return String(input);
  }
  if (typeof input === "object") {
    try {
      return JSON.stringify(input);
    } catch {
      return "Cannot display message";
    }
  }
  return "Cannot display message";
}
