import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import type { Plugin } from "vite";

export function responsiveImagesPlugin(): Plugin {
  return {
    name: "crm-responsive-images",
    async transform(_code, id) {
      if (!id.includes("?responsive")) return null;

      const cleanId = id.split("?")[0];
      const sourceBuffer = await fs.readFile(cleanId);
      const ext = path.extname(cleanId);
      const baseName = path.basename(cleanId, ext);

      const formats = ["avif", "webp", "png"] as const;
      const emittedAssets: Record<string, string> = {};

      for (const format of formats) {
        let outputBuffer: Buffer;
        try {
          if (format === "avif") {
            outputBuffer = await sharp(sourceBuffer).avif().toBuffer();
          } else if (format === "webp") {
            outputBuffer = await sharp(sourceBuffer).webp().toBuffer();
          } else {
            outputBuffer = await sharp(sourceBuffer).png().toBuffer();
          }

          const referenceId = this.emitFile({
            type: "asset",
            name: `${baseName}.${format}`,
            source: outputBuffer,
          });

          emittedAssets[format] = referenceId;
        } catch (e) {
          console.warn(`Failed to generate ${format} for ${cleanId}:`, e);
        }
      }

      // Special handling for ICO (static fallback)
      const icoPath = cleanId.replace(ext, ".ico");
      if (existsSync(icoPath)) {
        const icoBuffer = await fs.readFile(icoPath);
        const referenceId = this.emitFile({
          type: "asset",
          name: `${baseName}.ico`,
          source: icoBuffer,
        });
        emittedAssets["fallback"] = referenceId;
      }

      // Generate code that imports these emitted assets
      const importLines = Object.entries(emittedAssets)
        .map(
          ([key, refId]) =>
            `import img_${key} from "import.meta.ROLLUP_FILE_URL_${refId}";`,
        )
        .join("\n");

      // Wait, Vite doesn't like import.meta.ROLLUP_FILE_URL in transform.
      // The standard way is to use the referenceId and let Vite handle it,
      // but simpler is to return a module that exports the urls.

      const moduleCode = Object.entries(emittedAssets)
        .map(([key, refId]) => `import ${key} from "__VITE_ASSET__${refId}__";`)
        .join("\n");

      return {
        code: `
${moduleCode}
export default {
  ${Object.keys(emittedAssets)
    .map((k) => `${k === "fallback" ? "fallback" : k}: ${k}`)
    .join(",\n  ")}
};
`,
        map: null,
      };
    },
  };
}
