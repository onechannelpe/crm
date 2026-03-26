import type { IncomingMessage, ServerResponse } from "node:http";

import mdx from "@mdx-js/rollup";
import { solidStart } from "@solidjs/start/config";
import { nitroV2Plugin } from "@solidjs/vite-plugin-nitro-2";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

function parseCsv(raw: string | undefined): Set<string> {
  if (!raw) return new Set();

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0),
  );
}

const diagnosticChannels = parseCsv(process.env.DEBUG_DIAGNOSTICS);
const enableDevRequestTrace =
  diagnosticChannels.has("*") ||
  diagnosticChannels.has("all") ||
  diagnosticChannels.has("requests");

export default defineConfig({
  plugins: [
    ...(enableDevRequestTrace
      ? [
          {
            name: "dev-request-trace",
            apply: "serve" as const,
            configureServer(server: {
              middlewares: {
                use(
                  handler: (
                    req: IncomingMessage,
                    res: ServerResponse,
                    next: () => void,
                  ) => void,
                ): void;
              };
            }) {
              server.middlewares.use(
                (
                  req: IncomingMessage,
                  res: ServerResponse,
                  next: () => void,
                ) => {
                  const startedAt = Date.now();
                  const requestId = crypto.randomUUID().slice(0, 8);
                  const url = req.url ?? "";

                  console.log(
                    `[dev-request-trace] start id=${requestId} method=${req.method ?? "UNKNOWN"} url=${url}`,
                  );

                  res.on("finish", () => {
                    console.log(
                      `[dev-request-trace] finish id=${requestId} method=${req.method ?? "UNKNOWN"} url=${url} status=${res.statusCode} durationMs=${Date.now() - startedAt}`,
                    );
                  });

                  res.on("close", () => {
                    console.log(
                      `[dev-request-trace] close id=${requestId} method=${req.method ?? "UNKNOWN"} url=${url} status=${res.statusCode} finished=${res.writableEnded} durationMs=${Date.now() - startedAt}`,
                    );
                  });

                  next();
                },
              );
            },
          },
        ]
      : []),
    {
      enforce: "pre",
      ...mdx({
        jsx: true,
        jsxImportSource: "solid-js",
        providerImportSource: "solid-mdx",
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
      }),
    },
    solidStart({
      middleware: "./src/middleware.ts",
      extensions: ["mdx"],
    }),
    nitroV2Plugin({
      prerender: {
        routes: [
          "/legal/privacy",
          "/legal/terms",
          "/releases",
          "/docs",
          "/docs/getting-started",
        ],
      },
      preset: "bun",
    }),
    visualizer(),
  ],
  esbuild: {
    target: "es2022",
  },
});
