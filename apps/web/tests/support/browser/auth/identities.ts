import { hashPassword } from "~/lib/auth/password/password";

import { type TestIdentity } from "../../identities/catalog";
import type { BrowserDbRuntime } from "../runtime";
import type { BrowserIdentity, BrowserUserOptions } from "./types";

interface BrowserSeededIdentity extends TestIdentity {
  password: string;
}

const BROWSER_TEST_PASSWORD = "placeholder";

const BROWSER_IDENTITIES = {
  passkeyUser: {
    userId: 1,
    username: "valeria.paredes",
    branchId: 1,
    role: "admin",
    password: BROWSER_TEST_PASSWORD,
  },
  strongAuthUser: {
    userId: 12,
    username: "mario.aguirre",
    branchId: 1,
    role: "sales_manager",
    password: BROWSER_TEST_PASSWORD,
  },
} as const satisfies Record<string, BrowserSeededIdentity>;

export type BrowserIdentityName = keyof typeof BROWSER_IDENTITIES;

export function getBrowserIdentity(name: BrowserIdentityName) {
  return BROWSER_IDENTITIES[name];
}

let generatedUserCount = 0;

function buildGeneratedIdentity(role: BrowserUserOptions["role"]): {
  username: string;
  email: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  phone: string;
} {
  generatedUserCount += 1;
  const suffix = `${Date.now()}${generatedUserCount}`;

  return {
    username: `pw.${role}.${suffix}`,
    email: `pw.${role}.${suffix}@test.local`,
    names: "Playwright",
    firstSurname: role,
    secondSurname: "User",
    phone: `+5199${suffix.slice(-8)}`,
  };
}

export async function findBrowserIdentityByUsername(
  runtime: BrowserDbRuntime,
  username: string,
  password: string,
): Promise<BrowserIdentity> {
  const user = await runtime.repos.users.findByUsername(username);
  if (!user) {
    throw new Error(`Browser test identity '${username}' was not found`);
  }

  return {
    userId: user.id,
    username: user.username,
    email: user.email,
    branchId: user.branch_id,
    role: user.role,
    password,
  };
}

export async function getSeededBrowserIdentity(
  runtime: BrowserDbRuntime,
  name: BrowserIdentityName,
): Promise<BrowserIdentity> {
  const seeded = getBrowserIdentity(name);
  return await findBrowserIdentityByUsername(
    runtime,
    seeded.username,
    seeded.password,
  );
}

export async function ensureBrowserUser(
  runtime: BrowserDbRuntime,
  options: BrowserUserOptions,
): Promise<BrowserIdentity> {
  const safeUsername = options.username?.trim();

  if (safeUsername) {
    const existing = await runtime.repos.users.findByUsername(safeUsername);
    if (existing) {
      return {
        userId: existing.id,
        username: existing.username,
        email: existing.email,
        branchId: existing.branch_id,
        role: existing.role,
        password: BROWSER_TEST_PASSWORD,
      };
    }
  }

  const generated = buildGeneratedIdentity(options.role);
  const username = safeUsername ?? generated.username;
  const email =
    safeUsername !== undefined
      ? `${safeUsername.replace(/[^a-z0-9.]/gi, ".")}@test.local`
      : generated.email;
  const passwordHash = await hashPassword(BROWSER_TEST_PASSWORD);
  const userId = await runtime.repos.users.create({
    branch_id: options.branchId ?? 1,
    team_id: null,
    username,
    email,
    password_hash: passwordHash,
    names: generated.names,
    first_surname: generated.firstSurname,
    second_surname: generated.secondSurname,
    role: options.role,
    is_active: options.active === false ? 0 : 1,
  });

  if (options.onboardingCompleted !== false) {
    await runtime.repos.users.completeOnboarding(userId, {
      completedAt: Date.now(),
    });
  }

  return {
    userId,
    username,
    email,
    branchId: options.branchId ?? 1,
    role: options.role,
    password: BROWSER_TEST_PASSWORD,
  };
}
