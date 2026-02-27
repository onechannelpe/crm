import { existsSync, mkdirSync } from "node:fs";

const REFS_DIR = ".refs";

export async function ensureRefsGitignored(): Promise<void> {
  const gitignorePath = `${REFS_DIR}/.gitignore`;
  if (existsSync(gitignorePath)) return;
  mkdirSync(REFS_DIR, { recursive: true });
  await Bun.write(gitignorePath, "*\n");
}
