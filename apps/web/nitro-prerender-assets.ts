import { readFile } from "node:fs/promises";
import path from "node:path";

const ASSET_MIME_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};

// Nitro forces a standalone rolldown rebuild of the whole server entry for
// prerendering, regardless of the app's own builder (see nitro's prerender()
// in dist/_chunks/nitro.mjs: `builder: nitro.options.builder === "vite" ?
// "rolldown" : ...`). That rebuild never sees the Vite plugin pipeline, so it
// has no asset handling: binary image imports fail with "stream did not
// contain valid UTF-8" because rolldown's default loader reads every module
// as source text. This is a known, open Nitro 3 regression, not specific to
// this app: https://github.com/nuxt/nuxt/issues/35247.
//
// nitro.options.rollupConfig is explicitly merged into that rebuild's config
// (confirmed in dist/_build/rolldown.mjs), so a plugin registered there runs
// in the isolated prerender build without touching the working client/server
// Vite pipeline. It hands rolldown a data URI for known image extensions,
// which is enough for the prerendered legal/docs pages to build; none of
// them currently render these assets, and a data URI stays correct if one
// ever does.
export function nitroPrerenderAssetsPlugin() {
  return {
    name: "nitro-prerender-static-assets",
    async load(id: string) {
      const mimeType = ASSET_MIME_TYPES[path.extname(id)];
      if (!mimeType) return null;

      const buffer = await readFile(id);
      const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
      return `export default ${JSON.stringify(dataUri)};`;
    },
  };
}
