import { execFile } from "node:child_process";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

import { Client } from "pg";

const execFileAsync = promisify(execFile);

const BASE_URL =
  process.env.TEST_WEB_DB_URL ??
  process.env.WEB_DB_URL ??
  "postgres://postgres@localhost:5432/postgres";

const TEST_ROOT = join(process.cwd(), ".vitest-db");
const SERVER_ROOT = join(TEST_ROOT, "postgres-server");
const DATA_DIR = join(SERVER_ROOT, "data");
const LOG_FILE = join(SERVER_ROOT, "postgres.log");
const LOCK_DIR = join(TEST_ROOT, "postgres-server.lock");
const LEASE_DIR = join(SERVER_ROOT, "leases");

const CONNECTION_TIMEOUT_MS = 15_000;
const LOCK_WAIT_MS = 30_000;
const POLL_INTERVAL_MS = 100;
const IS_CI =
  process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";

function databaseUrl(name: string): string {
  const url = new URL(BASE_URL);
  url.pathname = `/${name}`;
  return url.toString();
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function connectionSettings() {
  const url = new URL(databaseUrl("postgres"));
  return {
    host: url.hostname || "localhost",
    port: url.port || "5432",
    user: decodeURIComponent(url.username || "postgres"),
  };
}

async function runPostgresTool(command: string, args: string[]): Promise<void> {
  try {
    await execFileAsync("mise", ["x", "postgres", "--", command, ...args], {
      cwd: process.cwd(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`failed to run ${command}: ${message}`, { cause: error });
  }
}

async function runPgCtl(args: string[]): Promise<void> {
  await runPostgresTool("pg_ctl", ["-D", DATA_DIR, ...args]);
}

async function canConnect(): Promise<boolean> {
  const client = new Client({
    connectionString: databaseUrl("postgres"),
    connectionTimeoutMillis: 500,
  });
  try {
    await client.connect();
    return true;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
}

async function managedServerPid(): Promise<number | null> {
  try {
    const pid = Number(
      (await readFile(join(DATA_DIR, "postmaster.pid"), "utf8"))
        .split("\n")[0]
        ?.trim(),
    );
    if (!Number.isInteger(pid) || pid <= 0) {
      return null;
    }

    process.kill(pid, 0);
    return pid;
  } catch {
    return null;
  }
}

async function isManagedServerRunning(): Promise<boolean> {
  return (await managedServerPid()) !== null;
}

async function waitForServer(): Promise<void> {
  const deadline = Date.now() + CONNECTION_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (await canConnect()) {
      return;
    }
    await sleep(POLL_INTERVAL_MS);
  }

  let log = "";
  try {
    log = await readFile(LOG_FILE, "utf8");
  } catch {
    log = "postgres log was not created";
  }

  throw new Error(
    `Postgres did not become ready within ${CONNECTION_TIMEOUT_MS}ms.\n${log}`,
  );
}

async function withStartupLock<T>(fn: () => Promise<T>): Promise<T> {
  const deadline = Date.now() + LOCK_WAIT_MS;

  while (true) {
    try {
      await mkdir(LOCK_DIR);
      break;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "EEXIST" &&
        Date.now() < deadline
      ) {
        await sleep(POLL_INTERVAL_MS);
        continue;
      }
      throw error;
    }
  }

  try {
    return await fn();
  } finally {
    await rm(LOCK_DIR, { force: true, recursive: true });
  }
}

async function initializeDataDir(): Promise<void> {
  await runPostgresTool("initdb", [
    "-D",
    DATA_DIR,
    "-U",
    connectionSettings().user,
    "--auth=trust",
  ]);
}

async function startManagedServer(): Promise<void> {
  const { host, port } = connectionSettings();
  await runPgCtl([
    "-l",
    LOG_FILE,
    "-o",
    `-h ${host} -p ${port} -k /tmp`,
    "start",
  ]);
}

async function stopManagedServer(): Promise<void> {
  if (!(await isManagedServerRunning())) {
    return;
  }

  await runPgCtl(["stop", "-m", "fast"]);
}

function leaseName(): string {
  const namespace = process.env.TEST_DB_NAMESPACE ?? "default";
  return `${namespace}-${process.pid}-${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function leasePath(name: string): string {
  return join(LEASE_DIR, name);
}

async function acquireLease(): Promise<string> {
  await mkdir(LEASE_DIR, { recursive: true });
  const name = leaseName();
  await writeFile(leasePath(name), `${process.pid}\n`, { flag: "wx" });
  return name;
}

async function removeStaleLeases(): Promise<void> {
  let names: string[];
  try {
    names = await readdir(LEASE_DIR);
  } catch {
    return;
  }

  await Promise.all(
    names.map(async (name) => {
      try {
        const pid = Number((await readFile(leasePath(name), "utf8")).trim());
        if (!Number.isInteger(pid) || pid <= 0) {
          await rm(leasePath(name), { force: true });
          return;
        }
        process.kill(pid, 0);
      } catch {
        await rm(leasePath(name), { force: true });
      }
    }),
  );
}

async function hasActiveLeases(): Promise<boolean> {
  await removeStaleLeases();
  try {
    return (await readdir(LEASE_DIR)).length > 0;
  } catch {
    return false;
  }
}

async function startOrAttachManagedServer(): Promise<string | null> {
  if (await canConnect()) {
    if (await isManagedServerRunning()) {
      return acquireLease();
    }
    return null;
  }

  if (IS_CI) {
    throw new Error(
      `Postgres is not reachable at ${databaseUrl(
        "postgres",
      )}. CI must provide the Postgres service instead of relying on local test startup.`,
    );
  }

  await mkdir(SERVER_ROOT, { recursive: true });

  return withStartupLock(async () => {
    if (await canConnect()) {
      if (await isManagedServerRunning()) {
        return acquireLease();
      }
      return null;
    }

    const lease = await acquireLease();

    try {
      await readFile(join(DATA_DIR, "PG_VERSION"), "utf8");
    } catch {
      await initializeDataDir();
    }

    await startManagedServer();
    await waitForServer();
    return lease;
  });
}

export async function acquirePostgresServer(): Promise<() => Promise<void>> {
  const lease = await startOrAttachManagedServer();

  return async () => {
    if (!lease) {
      return;
    }

    await withStartupLock(async () => {
      await rm(leasePath(lease), { force: true });
      if (await hasActiveLeases()) {
        return;
      }

      await stopManagedServer();
      await rm(SERVER_ROOT, { force: true, recursive: true });
    });
  };
}
