import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";

let cachedRoot: string | undefined;

export function getWorkspaceRoot(): string {
  if (cachedRoot) return cachedRoot;

  let current = process.cwd();

  while (current !== dirname(current)) {
    const packageJsonPath = resolve(current, "package.json");

    if (existsSync(packageJsonPath)) {
      const content = require(packageJsonPath);
      if (content.workspaces) {
        cachedRoot = current;
        return current;
      }
    }

    current = dirname(current);
  }

  throw new Error(
    "Could not find workspace root (no package.json with workspaces field)",
  );
}
