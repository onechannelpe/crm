import { existsSync } from "node:fs";

const REFS_DIR = ".refs";

export async function ensureRefsGitignored(): Promise<void> {
  const gitignorePath = `${REFS_DIR}/.gitignore`;

  if (!existsSync(REFS_DIR)) return;
  if (existsSync(gitignorePath)) return;

  await Bun.write(gitignorePath, "*\n");
}
