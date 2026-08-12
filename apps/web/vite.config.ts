import { responsiveImagesPlugin } from "@crm/images/vite";
import mdx from "@mdx-js/rollup";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import { solidStart } from "@solidjs/start/config";
import { nitro } from "nitro/vite";
import remarkFrontmatter from "remark-frontmatter";
import remarkMdxFrontmatter from "remark-mdx-frontmatter";
import { bundleAnalyzerPlugin } from "rolldown/experimental";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";

import { appAlias } from "./paths.ts";
import {
  createRequestTracePlugin,
  resolveRequestTraceConfig,
} from "./tracer.ts";

const requestTraceConfig = resolveRequestTraceConfig(process.env);

function shouldUploadSourceMaps(command: string): boolean {
  return (
    command === "build" &&
    Boolean(
      process.env.SENTRY_AUTH_TOKEN &&
      process.env.SENTRY_ORG &&
      process.env.SENTRY_PROJECT,
    )
  );
}

export default defineConfig(({ command }) => {
  const uploadSourceMaps = shouldUploadSourceMaps(command);

  return {
    cacheDir: process.env.VITE_CACHE_DIR,

    build: {
      sourcemap: uploadSourceMaps,
    },

    optimizeDeps: {
      include: ["@solid-primitives/keyed"],
    },

    resolve: {
      dedupe: ["solid-js", "solid-js/web"],
    },

    // SolidStart replaces `server-only` during Vite processing.
    ssr: {
      noExternal: ["server-only"],
    },

    server: {
      // Initialize the CSS-module cache for cold SSR renders.
      // See vitejs/vite#19606.
      perEnvironmentStartEndDuringDev: true,

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
            include: ["src/rpc/**/*.ts"],
          },
          onError: "./src/server-function-error.ts",
        },
      }),

      nitro({
        alias: { ...appAlias },
        plugins: ["./src/server/entrypoints/nitro/realtime-lifecycle.ts"],

        // Nitro does not inherit Vite's sourcemap setting.
        sourcemap: uploadSourceMaps,

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
      bundleAnalyzerPlugin({ format: "md" }),
      responsiveImagesPlugin(),

      ...(uploadSourceMaps
        ? [
            sentryVitePlugin({
              authToken: process.env.SENTRY_AUTH_TOKEN,
              org: process.env.SENTRY_ORG,
              project: process.env.SENTRY_PROJECT,

              // Debug IDs map stack traces without creating a release.
              release: { create: false },

              sourcemaps: {
                filesToDeleteAfterUpload: ["**/*.map"],
              },
              telemetry: false,
            }),
          ]
        : []),
    ],

    esbuild: {
      target: "es2022",
    },
  };
});
