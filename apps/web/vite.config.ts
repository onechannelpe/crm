import { resolve } from "node:path";

import { responsiveImagesPlugin } from "@crm/images/vite";
import mdx from "@mdx-js/rollup";
import { solidStart } from "@solidjs/start/config";
import { nitroV2Plugin } from "@solidjs/vite-plugin-nitro-2";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

import { createRequestTracePlugin, resolveRequestTraceConfig } from "./tracer";

const requestTraceConfig = resolveRequestTraceConfig(process.env);

export default defineConfig({
  plugins: [
    ...createRequestTracePlugin(requestTraceConfig),
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
      alias: {
        "~": resolve(process.cwd(), "src"),
      },
      esbuild: {
        options: {
          target: "esnext",
        },
      },
      experimental: {
        websocket: true,
      },
      handlers: [
        {
          route: "/api/records/imports/ws",
          handler: "./src/server/realtime/records-imports-ws.ts",
        },
      ],
      prerender: {
        autoSubfolderIndex: true,
        routes: [
          "/legal/privacy",
          "/legal/terms",
          "/releases",
          "/docs/",
          "/docs/getting-started",
        ],
      },
      preset: "bun",
    }),
    visualizer(),
    responsiveImagesPlugin(),
  ],
  esbuild: {
    target: "es2022",
  },
});
