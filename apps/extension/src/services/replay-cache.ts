const REPLAY_CACHE_KEY = "crm_extension_handoff_jtis_v1" as const;

interface ReplayRecord {
  jti: string;
  expiresAt: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeRecords(value: unknown): ReplayRecord[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(isObject)
    .map((record) => ({
      jti: typeof record.jti === "string" ? record.jti : "",
      expiresAt:
        typeof record.expiresAt === "number" ? record.expiresAt : Date.now(),
    }))
    .filter((record) => record.jti !== "");
}

async function readRecords(): Promise<ReplayRecord[]> {
  const stored = await browser.storage.local.get(REPLAY_CACHE_KEY);
  return normalizeRecords(stored[REPLAY_CACHE_KEY] as unknown);
}

async function writeRecords(records: ReplayRecord[]): Promise<void> {
  await browser.storage.local.set({ [REPLAY_CACHE_KEY]: records });
}

export async function hasConsumedHandoffJti(jti: string): Promise<boolean> {
  const now = Date.now();
  const current = await readRecords();
  const active = current.filter((record) => record.expiresAt > now);
  if (active.length !== current.length) {
    await writeRecords(active);
  }

  return active.some((record) => record.jti === jti);
}

export async function rememberConsumedHandoffJti(
  jti: string,
  expiresAt: number,
): Promise<void> {
  const now = Date.now();
  const current = await readRecords();
  const active = current.filter((record) => record.expiresAt > now);
  active.push({ jti, expiresAt });
  await writeRecords(active);
}
