import { test as base, expect } from "@playwright/test";

import {
  mockCancelledPasskey,
  mockUnsupportedPasskey,
} from "../../support/auth/browser-capabilities";
import {
  ensureBrowserUser,
  getSeededBrowserIdentity,
} from "../../support/auth/browser-identities";
import {
  createPasskeyFlow,
  ensurePasskey,
} from "../../support/auth/browser-passkeys";
import {
  loginAs,
  seedBrowserSession,
} from "../../support/auth/browser-sessions";
import type {
  BrowserIdentity,
  BrowserUserOptions,
} from "../../support/auth/browser-types";
import {
  createBrowserDbRuntime,
  disposeBrowserDbRuntime,
  resolveBrowserDbPathForProject,
  type BrowserDbRuntime,
} from "../../support/db/browser-runtime";
import type { SeededBrowserIdentityName } from "../../support/identities/seeded-identities";

interface BrowserAuthFixture {
  seeded(name: SeededBrowserIdentityName): Promise<BrowserIdentity>;
  user(options: BrowserUserOptions): Promise<BrowserIdentity>;
  loginAs(
    page: Parameters<typeof loginAs>[0],
    identity: BrowserIdentity,
    options?: Parameters<typeof seedBrowserSession>[2],
  ): Promise<void>;
  ensurePasskey(identity: BrowserIdentity): Promise<void>;
  createPasskeyFlow(
    identity: BrowserIdentity,
  ): ReturnType<typeof createPasskeyFlow>;
  mockUnsupportedPasskey(
    page: Parameters<typeof mockUnsupportedPasskey>[0],
  ): Promise<void>;
  mockCancelledPasskey(
    page: Parameters<typeof mockCancelledPasskey>[0],
  ): Promise<void>;
}

export const test = base.extend<
  { auth: BrowserAuthFixture },
  { browserDb: BrowserDbRuntime }
>({
  browserDb: [
    async ({ browser: _browser }, use, workerInfo) => {
      const runtime = createBrowserDbRuntime(
        resolveBrowserDbPathForProject(workerInfo.project.name),
      );
      await use(runtime);
      await disposeBrowserDbRuntime(runtime);
    },
    { scope: "worker" },
  ],
  auth: async ({ baseURL, browserDb }, use) => {
    const resolvedBaseURL = baseURL ?? "http://127.0.0.1:4174";

    await use({
      seeded: async (name) => await getSeededBrowserIdentity(browserDb, name),
      user: async (options) => await ensureBrowserUser(browserDb, options),
      loginAs: async (page, identity, options) =>
        await loginAs(page, resolvedBaseURL, browserDb, identity, options),
      ensurePasskey: async (identity) =>
        await ensurePasskey(browserDb, identity),
      createPasskeyFlow: async (identity) =>
        await createPasskeyFlow(browserDb, identity),
      mockUnsupportedPasskey,
      mockCancelledPasskey,
    });
  },
});

export { expect };
