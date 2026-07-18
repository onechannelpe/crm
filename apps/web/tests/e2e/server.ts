import { type ChildProcess, spawn } from "node:child_process";

// Spawns one built SolidStart/Nitro server per Playwright worker, bound to that
// worker's cloned database. Running the production build (not the Vite dev
// server) means no optimizeDeps step, so N servers boot quickly and in parallel
// without the cold-start races that force a single shared dev server.

const HEALTH_TIMEOUT_MS = 60_000;
const HEALTH_POLL_MS = 200;

export interface RunningServer {
  baseURL: string;
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
        `e2e server exited before becoming healthy (see output above)`,
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
      // Invite links are built from this origin (not the request), so it must
      // point at this worker's own server for the invitee's navigation to land.
      APP_PUBLIC_ORIGIN: baseURL,
      // Route email to the stdout log transport instead of a real provider; the
      // invite/reset flows still run for real. Delivery is best-effort and the
      // invite link is surfaced in the UI, so specs never read email back.
      NOTIFICATION_ROUTES: "email:log",
    },
    // Inherit stdio so server logs surface directly in the test output.
    stdio: ["ignore", "inherit", "inherit"],
  });

  try {
    await waitForHealth(baseURL, proc);
  } catch (error) {
    proc.kill("SIGKILL");
    throw error;
  }

  return {
    baseURL,
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
