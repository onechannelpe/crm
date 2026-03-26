import type { IncomingMessage } from "node:http";

import type { Plugin, ViteDevServer } from "vite";

type RequestTraceMode = "important" | "verbose";

type RequestTraceConfig = {
  enabled: boolean;
  mode: RequestTraceMode;
  slowThresholdMs: number;
};

function parseCsv(raw: string | undefined): Set<string> {
  if (!raw) return new Set();

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0),
  );
}

function parseSlowThreshold(raw: string | undefined): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 250;
}

function getRequestTraceMode(raw: string | undefined): RequestTraceMode {
  return raw?.toLowerCase() === "verbose" ? "verbose" : "important";
}

function isDocumentRequest(req: IncomingMessage): boolean {
  return req.headers["sec-fetch-dest"] === "document";
}

function isServerRequest(url: string): boolean {
  return url.startsWith("/_server") || url.startsWith("/api/");
}

function isAssetRequest(url: string): boolean {
  return (
    url.startsWith("/@fs/") ||
    url.startsWith("/@id/") ||
    url.startsWith("/@vite/") ||
    url.startsWith("/node_modules/") ||
    url.includes("?t=") ||
    /\.[a-z0-9]+($|\?)/i.test(url)
  );
}

function shouldLogCompletedRequest(params: {
  req: IncomingMessage;
  url: string;
  statusCode: number;
  durationMs: number;
  mode: RequestTraceMode;
  slowThresholdMs: number;
}): boolean {
  const { req, url, statusCode, durationMs, mode, slowThresholdMs } = params;

  if (mode === "verbose") return true;
  if (statusCode >= 400) return true;
  if (durationMs >= slowThresholdMs) return true;
  if ((req.method ?? "GET") !== "GET") return true;
  if (isDocumentRequest(req)) return true;
  if (isServerRequest(url)) return true;
  if (isAssetRequest(url)) return false;
  return true;
}

function formatRequestLine(params: {
  phase: "complete" | "aborted";
  requestId: string;
  req: IncomingMessage;
  url: string;
  statusCode: number;
  durationMs: number;
  extra?: Record<string, string | number | boolean>;
}): string {
  const { phase, requestId, req, url, statusCode, durationMs, extra } = params;
  const fields = [
    `[dev-request-trace] ${phase}`,
    `id=${requestId}`,
    `method=${req.method ?? "UNKNOWN"}`,
    `url=${url}`,
    `status=${statusCode}`,
    `durationMs=${durationMs}`,
  ];

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      fields.push(`${key}=${value}`);
    }
  }

  return fields.join(" ");
}

export function resolveRequestTraceConfig(
  env: NodeJS.ProcessEnv,
): RequestTraceConfig {
  const diagnosticChannels = parseCsv(env.DEBUG_DIAGNOSTICS);
  const enabled =
    diagnosticChannels.has("*") ||
    diagnosticChannels.has("all") ||
    diagnosticChannels.has("requests");

  return {
    enabled,
    mode: getRequestTraceMode(env.DEBUG_DIAGNOSTICS_REQUESTS),
    slowThresholdMs: parseSlowThreshold(env.DEBUG_DIAGNOSTICS_REQUESTS_SLOW_MS),
  };
}

export function createRequestTracePlugin(config: RequestTraceConfig): Plugin[] {
  if (!config.enabled) return [];

  return [
    {
      name: "dev-request-trace",
      apply: "serve",
      configureServer(server: ViteDevServer) {
        server.middlewares.use((req, res, next) => {
          const startedAt = Date.now();
          const requestId = crypto.randomUUID().slice(0, 8);
          const url = req.url ?? "";
          let completed = false;

          res.on("finish", () => {
            completed = true;

            const durationMs = Date.now() - startedAt;
            if (
              !shouldLogCompletedRequest({
                req,
                url,
                statusCode: res.statusCode,
                durationMs,
                mode: config.mode,
                slowThresholdMs: config.slowThresholdMs,
              })
            ) {
              return;
            }

            console.log(
              formatRequestLine({
                phase: "complete",
                requestId,
                req,
                url,
                statusCode: res.statusCode,
                durationMs,
              }),
            );
          });

          res.on("close", () => {
            if (completed || res.writableEnded) return;

            console.warn(
              formatRequestLine({
                phase: "aborted",
                requestId,
                req,
                url,
                statusCode: res.statusCode,
                durationMs: Date.now() - startedAt,
                extra: { finished: res.writableEnded },
              }),
            );
          });

          next();
        });
      },
    },
  ];
}
