import os from "node:os";
import path from "node:path";
import { mkdtemp, rm } from "node:fs/promises";

import { chromium, type BrowserContext, type Page } from "@playwright/test";

import type { RuntimeMessage, RuntimeResponse } from "../../../src/domain/messages";

interface ExtensionSession {
  context: BrowserContext;
  extensionId: string;
  userDataDir: string;
}

function extensionArgs(extensionOutputPath: string): string[] {
  return [
    "--no-sandbox",
    `--disable-extensions-except=${extensionOutputPath}`,
    `--load-extension=${extensionOutputPath}`,
  ];
}

function getExtensionIdFromWorkerUrl(url: string): string {
  const extensionId = new URL(url).hostname;
  if (!extensionId) {
    throw new Error(`Unable to resolve extension id from service worker URL: ${url}`);
  }
  return extensionId;
}

export async function launchExtensionSession(input: {
  extensionOutputPath: string;
  userDataDir?: string;
}): Promise<ExtensionSession> {
  const userDataDir =
    input.userDataDir ??
    (await mkdtemp(path.join(os.tmpdir(), "crm-extension-e2e-")));

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args: extensionArgs(input.extensionOutputPath),
  });

  let serviceWorker = context.serviceWorkers()[0];
  if (!serviceWorker) {
    serviceWorker = await context.waitForEvent("serviceworker");
  }

  return {
    context,
    extensionId: getExtensionIdFromWorkerUrl(serviceWorker.url()),
    userDataDir,
  };
}

export async function openPopupPage(
  context: BrowserContext,
  extensionId: string,
): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await page.waitForLoadState("domcontentloaded");
  return page;
}

export async function sendRuntimeMessage(
  page: Page,
  message: RuntimeMessage,
): Promise<RuntimeResponse> {
  return page.evaluate(async (payload) => {
    return chrome.runtime.sendMessage(payload);
  }, message);
}

export async function closeExtensionSession(
  session: ExtensionSession,
  options?: { cleanupUserDataDir?: boolean },
): Promise<void> {
  await session.context.close();

  if (options?.cleanupUserDataDir !== false) {
    await rm(session.userDataDir, { recursive: true, force: true });
  }
}
