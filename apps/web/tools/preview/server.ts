import { type ChildProcess, spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const PORT = 3900;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const LOCKFILE = resolve(process.cwd(), ".preview-server.json");
const LOG_FILE = resolve(process.cwd(), ".preview-server.log");

// The first boot against a fresh VITE_CACHE_DIR pays Vite's one-time
// dependency pre-bundle cost (measured ~180s against this repo's dep graph).
// Every boot after that reuses the cache and is ready in ~2s, so this ceiling
// only matters for a genuinely broken server, not the common case.
const HEALTH_TIMEOUT_MS = 300_000;
const HEALTH_POLL_MS = 200;
const HEALTH_LOG_INTERVAL_MS = 10_000;
const STOP_TIMEOUT_MS = 5_000;

interface Lock {
  pid: number;
  dbUrl: string;
  startedAt: string;
}

function readLock(): Lock | null {
  if (!existsSync(LOCKFILE)) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(LOCKFILE, "utf8"));
  } catch {
    return null;
  }
}

function writeLock(lock: Lock): void {
  writeFileSync(LOCKFILE, JSON.stringify(lock, null, 2));
}

function clearLock(): void {
  try {
    unlinkSync(LOCKFILE);
  } catch {
    // Already gone.
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function isHealthy(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/login`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForHealth(proc: ChildProcess): Promise<void> {
  const start = Date.now();
  const deadline = start + HEALTH_TIMEOUT_MS;
  let exited = false;
  let nextLogAt = start + HEALTH_LOG_INTERVAL_MS;

  proc.once("exit", () => {
    exited = true;
  });

  while (Date.now() < deadline) {
    if (exited) {
      throw new Error(
        `preview server exited before becoming healthy; see ${LOG_FILE}`,
      );
    }

    if (await isHealthy()) {
      return;
    }

    // First boot against a fresh Vite cache can take minutes (dependency
    // pre-bundling). Without this, the CLI looks hung to whoever ran it.
    const now = Date.now();
    if (now >= nextLogAt) {
      console.log(
        `[preview] still waiting for dev server (${Math.round((now - start) / 1000)}s elapsed, first boot pre-bundles dependencies)...`,
      );
      nextLogAt = now + HEALTH_LOG_INTERVAL_MS;
    }

    await new Promise((done) => setTimeout(done, HEALTH_POLL_MS));
  }

  throw new Error(
    `preview server did not become healthy within ${HEALTH_TIMEOUT_MS}ms; see ${LOG_FILE}`,
  );
}

// `detached: true` puts the child in its own process group (setsid), so it
// survives this CLI process exiting. stdio is redirected to real file
// descriptors rather than piped, since a piped stdio object would itself
// keep this process's event loop alive waiting on the stream.
async function spawnDetached(dbUrl: string): Promise<number> {
  const log = openSync(LOG_FILE, "a");

  const proc = spawn("bun", ["run", "dev:preview-server"], {
    detached: true,
    stdio: ["ignore", log, log],
    env: {
      ...process.env,
      NODE_ENV: "development",
      WEB_DB_URL: dbUrl,
      PORT: String(PORT),
      HOST: "127.0.0.1",
      NITRO_PORT: String(PORT),
      NITRO_HOST: "127.0.0.1",

      // Links are built from this value instead of the incoming request.
      APP_PUBLIC_ORIGIN: BASE_URL,

      // Run notification flows without sending real email/WhatsApp.
      NOTIFICATION_ROUTES: "email:log",

      // Isolated from the interactive dev server's cache/uploads so the two
      // can run concurrently without corrupting each other.
      VITE_CACHE_DIR: resolve(process.cwd(), ".vite-preview"),
      WEB_UPLOADS_ROOT: ".preview-storage/documents",
    },
  });

  closeSync(log);
  proc.unref();

  if (proc.pid === undefined) {
    throw new Error("failed to spawn preview dev server");
  }

  try {
    await waitForHealth(proc);
  } catch (error) {
    killGroup(proc.pid);
    throw error;
  }

  return proc.pid;
}

// Signals the whole process group, not just the `bun run` wrapper PID, so
// Vite's own child processes (esbuild, etc.) do not linger as orphans.
function killGroup(pid: number): void {
  try {
    process.kill(-pid, "SIGTERM");
  } catch {
    // Already gone.
  }
}

function killGroupNow(pid: number): void {
  try {
    process.kill(-pid, "SIGKILL");
  } catch {
    // Already gone.
  }
}

export async function stopServer(): Promise<void> {
  const lock = readLock();

  if (!lock) {
    console.log("[preview] no server running");
    return;
  }

  killGroup(lock.pid);

  const deadline = Date.now() + STOP_TIMEOUT_MS;

  while (isAlive(lock.pid) && Date.now() < deadline) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((done) => setTimeout(done, 200));
  }

  if (isAlive(lock.pid)) {
    killGroupNow(lock.pid);
  }

  clearLock();
  console.log(`[preview] stopped (pid ${lock.pid})`);
}

export async function ensureServer(
  dbUrl: string,
  options: { forceRestart: boolean },
): Promise<{ baseURL: string }> {
  const lock = readLock();
  const canReuse =
    !options.forceRestart &&
    lock !== null &&
    lock.dbUrl === dbUrl &&
    isAlive(lock.pid);

  if (canReuse && (await isHealthy())) {
    return { baseURL: BASE_URL };
  }

  if (lock) {
    await stopServer();
  }

  console.log("[preview] starting dev server...");
  const pid = await spawnDetached(dbUrl);

  writeLock({ pid, dbUrl, startedAt: new Date().toISOString() });

  return { baseURL: BASE_URL };
}
