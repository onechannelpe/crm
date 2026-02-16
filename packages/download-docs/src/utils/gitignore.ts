import { existsSync } from "node:fs";

const DOCS_DIR = ".docs";

export async function ensureDocsGitignored(): Promise<void> {
  await ensureDocsDirectoryGitignore();
}

async function ensureDocsDirectoryGitignore(): Promise<void> {
  if (!existsSync(DOCS_DIR)) return;

  const docsGitignorePath = `${DOCS_DIR}/.gitignore`;
  if (!existsSync(docsGitignorePath)) {
    await Bun.write(docsGitignorePath, "*\n");
  }
}

