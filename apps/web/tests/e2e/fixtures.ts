import {
  test as base,
  expect,
  type Browser,
  type Page,
} from "@playwright/test";

import { cloneTemplate, dropDatabase, withDatabase, WorkerDb } from "./db";
import { readManifest } from "./manifest";
import { rosterByKey, type RosterKey } from "./roster";
import { startServer, type RunningServer } from "./server";

const manifest = readManifest();

// Each worker owns a private database and server on its own port, so tests in
// different workers never share state. 41_100 + parallelIndex keeps ports
// disjoint across workers; cap `workers` in the config to bound the range.
const BASE_PORT = 41_100;

interface WorkerDbHandle {
  db: WorkerDb;
  dbName: string;
}

interface WorkerFixtures {
  workerDb: WorkerDbHandle;
  workerServer: RunningServer;
}

interface TestFixtures {
  // Authenticate as a role on demand (own browser context + session cookie).
  signInAs: (key: RosterKey) => Promise<Page>;
  asExecutive: Page;
  asBackOffice: Page;
  asManager: Page;
  asAdmin: Page;
  asSuperuser: Page;
  // Auto fixture: restore the worker database to the pristine template between
  // tests. Runs automatically during setup, before any test body.
  resetState: void;
}

async function openRolePage(
  browser: Browser,
  baseURL: string,
  key: RosterKey,
): Promise<Page> {
  const user = rosterByKey(key);
  const context = await browser.newContext({ baseURL });
  // Provide `url` only: Playwright derives domain and path from it, and rejects
  // a cookie that also sets `path` alongside `url`.
  await context.addCookies([
    { name: "session", value: user.token, url: baseURL },
  ]);
  return context.newPage();
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  workerDb: [
    // Playwright requires a destructuring pattern; this fixture has no deps.
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const dbName = `crm_e2e_w${test.info().parallelIndex}_${Date.now().toString(36)}`;
      await cloneTemplate(manifest.maintenanceUrl, manifest.templateDb, dbName);
      const db = await WorkerDb.open(
        withDatabase(manifest.maintenanceUrl, dbName),
      );
      try {
        await use({ db, dbName });
      } finally {
        await db.close();
        await dropDatabase(manifest.maintenanceUrl, dbName);
      }
    },
    { scope: "worker" },
  ],

  workerServer: [
    async ({ workerDb }, use) => {
      const port = BASE_PORT + test.info().parallelIndex;
      const server = await startServer({
        serverEntry: manifest.serverEntry,
        port,
        dbUrl: withDatabase(manifest.maintenanceUrl, workerDb.dbName),
      });
      try {
        await use(server);
      } finally {
        await server.stop();
      }
    },
    { scope: "worker" },
  ],

  // Point Playwright's built-in baseURL at this worker's server.
  baseURL: async ({ workerServer }, use) => {
    await use(workerServer.baseURL);
  },

  resetState: [
    async ({ workerDb }, use) => {
      // Restore the worker database to the pristine template so the previous
      // test does not bleed into this one.
      await workerDb.db.reset(manifest.reset);
      await use();
    },
    { auto: true },
  ],

  signInAs: async ({ browser, workerServer }, use) => {
    const pages: Page[] = [];
    await use(async (key) => {
      const page = await openRolePage(browser, workerServer.baseURL, key);
      pages.push(page);
      return page;
    });
    for (const page of pages) {
      await page.context().close();
    }
  },

  // Inline (not factory-generated) so Playwright can read each fixture's
  // dependencies from its source.
  //
  // None of these depend on `resetState` explicitly: it is an auto fixture, so
  // it already restores the database during setup, before any test body
  // navigates.
  asExecutive: async ({ browser, workerServer }, use) => {
    const page = await openRolePage(browser, workerServer.baseURL, "executive");
    await use(page);
    await page.context().close();
  },
  asBackOffice: async ({ browser, workerServer }, use) => {
    const page = await openRolePage(
      browser,
      workerServer.baseURL,
      "back_office",
    );
    await use(page);
    await page.context().close();
  },
  asManager: async ({ browser, workerServer }, use) => {
    const page = await openRolePage(
      browser,
      workerServer.baseURL,
      "sales_manager",
    );
    await use(page);
    await page.context().close();
  },
  asAdmin: async ({ browser, workerServer }, use) => {
    const page = await openRolePage(browser, workerServer.baseURL, "admin");
    await use(page);
    await page.context().close();
  },
  asSuperuser: async ({ browser, workerServer }, use) => {
    const page = await openRolePage(browser, workerServer.baseURL, "superuser");
    await use(page);
    await page.context().close();
  },
});

export { expect };
