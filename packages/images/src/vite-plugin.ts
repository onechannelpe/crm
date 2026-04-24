import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";
import type { Plugin, ResolvedConfig } from "vite";

export function responsiveImagesPlugin(): Plugin {
  let config: ResolvedConfig;

  return {
    name: "crm-responsive-images",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        // req.url might be relative or include the base path
        const urlPath = req.url?.split("?")[0] || "";
        const searchParams = new URLSearchParams(req.url?.split("?")[1] || "");
        const format = searchParams.get("responsive-format");

        if (format) {
          // Resolve the file path relative to the root
          const filePath = path.join(config.root, urlPath);
          if (existsSync(filePath)) {
            try {
              const sourceBuffer = await fs.readFile(filePath);
              let outputBuffer: Buffer;
              let contentType = `image/${format}`;

              if (format === "avif") {
                outputBuffer = await sharp(sourceBuffer).avif().toBuffer();
              } else if (format === "webp") {
                outputBuffer = await sharp(sourceBuffer).webp().toBuffer();
              } else if (format === "ico") {
                const icoPath = filePath.replace(
                  path.extname(filePath),
                  ".ico",
                );
                if (existsSync(icoPath)) {
                  outputBuffer = await fs.readFile(icoPath);
                } else {
                  outputBuffer = await sharp(sourceBuffer).png().toBuffer();
                  contentType = "image/png";
                }
                contentType = "image/x-icon";
              } else {
                outputBuffer = await sharp(sourceBuffer).png().toBuffer();
              }

              res.setHeader("Content-Type", contentType);
              res.setHeader("Cache-Control", "max-age=3600");
              res.end(outputBuffer);
              return;
            } catch (e) {
              return next(e);
            }
          }
        }
        next();
      });
    },
    async transform(_code, id) {
      if (!id.includes("?responsive")) return null;

      const cleanId = id.split("?")[0];
      const isDev = config.command === "serve";

      if (isDev) {
        const relativePath = path.relative(config.root, cleanId);
        // We use the absolute path from the root for the dev URL
        const results = {
          avif: `/${relativePath}?responsive-format=avif`,
          webp: `/${relativePath}?responsive-format=webp`,
          png: `/${relativePath}?responsive-format=png`,
          fallback: `/${relativePath}?responsive-format=ico`,
        };
        return {
          code: `export default ${JSON.stringify(results, null, 2)};`,
          map: null,
        };
      }

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

      const moduleOutput = Object.entries(emittedAssets)
        .map(
          ([key, refId]) =>
            `${key === "fallback" ? "fallback" : key}: new URL(import.meta.ROLLUP_FILE_URL_${refId}, import.meta.url).href`,
        )
        .join(",\n  ");

      return {
        code: `export default {\n  ${moduleOutput}\n};`,
        map: null,
      };
    },
  };
}
