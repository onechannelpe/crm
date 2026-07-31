export function asObject(
  value: unknown,
  label: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be a plain object`);
  }

  return value as Record<string, unknown>;
}

export function asStringArray(value: unknown, label: string): string[] {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === "string")
  ) {
    throw new Error(`${label} must be string[]`);
  }

  return value as string[];
}

export function asString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new Error(`${label} must be a string`);
  }

  return value;
}

export function asBoolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label} must be a boolean`);
  }

  return value;
}

export async function loadJson(path: string): Promise<unknown> {
  return Bun.file(path).json() as Promise<unknown>;
}

export async function writeArtifact(
  path: string,
  content: string,
): Promise<void> {
  await Bun.write(path, content);
}

// Only check artifacts committed to the repository. Generated files that are
// gitignored may not exist on a fresh checkout.
export async function checkArtifact(
  path: string,
  content: string,
): Promise<void> {
  let existing = "";

  try {
    existing = await Bun.file(path).text();
  } catch {
    // File does not exist yet.
  }

  if (existing.trimEnd() !== content.trimEnd()) {
    throw new Error(
      `${path} is out of date. run codegen:generate to regenerate`,
    );
  }
}
