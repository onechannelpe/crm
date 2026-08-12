import type { ImageSource } from "./components/responsive-image";
import { detectSupportedImageFormats } from "./format-support";

export async function resolveImageSourceUrl(
  sources: ImageSource,
): Promise<string> {
  const support = await detectSupportedImageFormats();

  if (support.avif && sources.avif) {
    return sources.avif;
  }

  if (support.webp && sources.webp) {
    return sources.webp;
  }

  return sources.png ?? sources.jpg ?? sources.fallback;
}
