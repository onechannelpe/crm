import mdx from "@mdx-js/rollup";
import { solidStart } from "@solidjs/start/config";
import { nitroV2Plugin } from "@solidjs/vite-plugin-nitro-2";
import remarkFrontmatter from "remark-frontmatter";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    {
      enforce: "pre",
      ...mdx({
        jsx: true,
        jsxImportSource: "solid-js",
        providerImportSource: "solid-mdx",
        remarkPlugins: [remarkFrontmatter],
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
