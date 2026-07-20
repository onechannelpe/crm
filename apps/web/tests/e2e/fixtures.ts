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
  signInAs: (key: RosterKey) => Promise<Page>;
  asExecutive: Page;
  asBackOffice: Page;
  asManager: Page;
  asAdmin: Page;
  asSuperuser: Page;
  resetState: void;
}

async function openRolePage(
  browser: Browser,
  baseURL: string,
  key: RosterKey,
): Promise<Page> {
  const user = rosterByKey(key);
  const context = await browser.newContext({ baseURL });

  // Playwright rejects cookies that specify both `url` and `path`.
  await context.addCookies([
    { name: "session", value: user.token, url: baseURL },
  ]);

  return context.newPage();
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  workerDb: [
    // Playwright requires destructuring even when the fixture has no dependencies.
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

  baseURL: async ({ workerServer }, use) => {
    await use(workerServer.baseURL);
  },

  resetState: [
    async ({ workerDb }, use) => {
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

  // Keep these fixtures inline so Playwright can infer their dependencies.
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
