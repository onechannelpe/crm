import { type ChildProcess, spawn } from "node:child_process";
import { createInterface } from "node:readline";

import { type LoggedMail, parseLoggedMail } from "@crm/message-channels";

// Spawns one built SolidStart/Nitro server per Playwright worker, bound to that
// worker's cloned database. Running the production build (not the Vite dev
// server) means no optimizeDeps step, so N servers boot quickly and in parallel
// without the cold-start races that force a single shared dev server.

const HEALTH_TIMEOUT_MS = 60_000;
const HEALTH_POLL_MS = 200;

export interface RunningServer {
  baseURL: string;
  // Emails the log transport recorded on this server's stdout since the last
  // clearMail(). Live array: reads observe lines as they arrive.
  mail: LoggedMail[];
  clearMail(): void;
  stop(): Promise<void>;
}

async function waitForHealth(
  baseURL: string,
  proc: ChildProcess,
): Promise<void> {
  const deadline = Date.now() + HEALTH_TIMEOUT_MS;
  let exited = false;
  proc.once("exit", () => {
    exited = true;
  });

  while (Date.now() < deadline) {
    if (exited) {
      throw new Error(
        `e2e server exited before becoming healthy (see piped output above)`,
      );
    }
    try {
      // /login renders unauthenticated and warms the SSR pipeline.
      const response = await fetch(`${baseURL}/login`);
      if (response.ok) {
        return;
      }
    } catch {
      // Connection refused until the server is listening; keep polling.
    }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_MS));
  }

  throw new Error(
    `e2e server did not become healthy within ${HEALTH_TIMEOUT_MS}ms`,
  );
}

export async function startServer(options: {
  serverEntry: string;
  port: number;
  dbUrl: string;
}): Promise<RunningServer> {
  const baseURL = `http://127.0.0.1:${options.port}`;

  const proc = spawn("bun", ["run", options.serverEntry], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      // Nitro's bun preset reads NITRO_PORT/NITRO_HOST (see compose.app.yml);
      // PORT/HOST are set too as a fallback.
      NITRO_PORT: String(options.port),
      NITRO_HOST: "127.0.0.1",
      PORT: String(options.port),
      HOST: "127.0.0.1",
      WEB_DB_URL: options.dbUrl,
      // Record composed email to stdout instead of sending it; the invite/reset
      // flows still run for real. `mail` recovers each message from that output.
      NOTIFICATION_ROUTES: "email:log",
    },
    stdio: ["ignore", "pipe", "inherit"],
  });

  const mail: LoggedMail[] = [];
  // stdout must be drained or the child's pipe buffer fills and blocks it. Tee
  // every line to our own stdout for visibility, and collect the ones the log
  // transport marked.
  if (proc.stdout) {
    const lines = createInterface({ input: proc.stdout });
    lines.on("line", (line) => {
      process.stdout.write(`${line}\n`);
      const recorded = parseLoggedMail(line);
      if (recorded) mail.push(recorded);
    });
  }

  try {
    await waitForHealth(baseURL, proc);
  } catch (error) {
    proc.kill("SIGKILL");
    throw error;
  }

  return {
    baseURL,
    mail,
    clearMail() {
      mail.length = 0;
    },
    async stop() {
      if (proc.exitCode !== null) {
        return;
      }
      await new Promise<void>((resolve) => {
        proc.once("exit", () => resolve());
        proc.kill("SIGTERM");
        // Nitro's bun server shuts down promptly; force-kill if it lingers.
        setTimeout(() => proc.kill("SIGKILL"), 3_000);
      });
    },
  };
}
