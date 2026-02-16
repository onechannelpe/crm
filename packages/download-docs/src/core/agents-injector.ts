import type { Result } from "../utils/result.ts";
import { Ok, Err } from "../utils/result.ts";

const AGENTS_MD_PATH = "AGENTS.md";

export async function injectDocsIndex(
  markerStart: string,
  markerEnd: string,
  indexContent: string,
): Promise<Result<void, string>> {
  const content = await Bun.file(AGENTS_MD_PATH).text();

  if (!content.includes(markerStart) || !content.includes(markerEnd)) {
    return Err(
      `Markers not found in AGENTS.md. Expected:\n${markerStart}\n${markerEnd}`,
    );
  }

  const startIndex = content.indexOf(markerStart);
  const endIndex = content.indexOf(markerEnd);

  if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
    return Err("Invalid marker positions in AGENTS.md");
  }

  const beforeMarker = content.substring(0, startIndex + markerStart.length);
  const afterMarker = content.substring(endIndex);

  const updatedContent = `${beforeMarker}\n${indexContent}\n${afterMarker}`;
  await Bun.write(AGENTS_MD_PATH, updatedContent);

  return Ok(undefined);
}
