import { resolve } from "node:path";

import { responsiveImagesPlugin } from "@crm/images/vite";
import mdx from "@mdx-js/rollup";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { solidStart } from "@solidjs/start/config";
import { nitro } from "nitro/vite";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

import { createRequestTracePlugin, resolveRequestTraceConfig } from "./tracer";

const requestTraceConfig = resolveRequestTraceConfig(process.env);

export default defineConfig({
  // Dev and E2E use different env files, so they must not share a Vite cache.
  cacheDir: process.env.VITE_CACHE_DIR,

  optimizeDeps: {
    include: ["@solid-primitives/keyed"],
  },

  resolve: {
    dedupe: ["solid-js", "solid-js/web"],
  },

  server: {
    // Initialize Vite's CSS-module cache for SSR environments too.
    // Without this, a cold SSR render can fail with vitejs/vite#19606.
    perEnvironmentStartEndDuringDev: true,

    // Uploaded files are runtime data. Watching them restarts SolidStart's
    // route handler while the browser is requesting the newly stored file.
    watch: {
      ignored: ["**/.local-storage/**"],
    },
  },

  plugins: [
    ...createRequestTracePlugin(requestTraceConfig),
    {
      enforce: "pre",
      ...mdx({
        include: /\.mdx?$/,
        jsx: true,
        jsxImportSource: "solid-js",
        providerImportSource: "solid-mdx",
        remarkPlugins: [remarkFrontmatter, remarkMdxFrontmatter],
      }),
    },
    solidStart({
      middleware: "./src/middleware.ts",
      extensions: ["md", "mdx"],
      serialization: {
        mode: "json",
      },
      serverFunctions: {
        filter: {
          include: ["src/rpc/**/*.query.ts", "src/rpc/**/*.action.ts"],
        },
        onError: "./src/server-function-error.ts",
      },
    }),
    nitro({
      alias: {
        "~": resolve(process.cwd(), "src"),
      },
      rollupConfig: {
        external: [/^@node-rs\/argon2/],
      },
      prerender: {
        autoSubfolderIndex: true,
        routes: [
          "/legal/privacy",
          "/legal/terms",
          "/updates",
          "/docs/",
          "/docs/getting-started",
        ],
      },
      preset: "bun",
    }),
    visualizer(),
    responsiveImagesPlugin(),
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
    }),
  ],

  esbuild: {
    target: "es2022",
  },
});
