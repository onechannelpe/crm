import type { Result } from "../utils/result.ts";
import { Ok, Err } from "../utils/result.ts";

const AGENTS_MD_PATH = "AGENTS.md";

export async function injectIndex(
  markerStart: string,
  markerEnd: string,
  indexContent: string,
): Promise<Result<void, string>> {
  const content = await Bun.file(AGENTS_MD_PATH).text();

  const startIndex = content.indexOf(markerStart);
  const endIndex = content.indexOf(markerEnd);

  if (startIndex === -1 || endIndex === -1) {
    return Err(
      `Markers not found in AGENTS.md. Expected:\n  ${markerStart}\n  ${markerEnd}`,
    );
  }

  if (startIndex >= endIndex) {
    return Err("markerStart must appear before markerEnd in AGENTS.md");
  }

  const before = content.substring(0, startIndex + markerStart.length);
  const after = content.substring(endIndex);
  await Bun.write(AGENTS_MD_PATH, `${before}\n${indexContent}\n${after}`);

  return Ok(undefined);
}
