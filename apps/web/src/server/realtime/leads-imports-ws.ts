import { defineWebSocketHandler } from "h3";

import { hasPermission, type Role } from "~/lib/auth/access/rbac";
import { canAccessLeadImportJob } from "~/server/leads/imports/api";
import { buildLeadImportProgressEvent } from "~/server/leads/imports/progress-events";
import { serverRuntime } from "~/server/runtime";

import { ensureLeadsImportsProgressBridge } from "./leads-imports-progress-bridge";

type WsHooks = Parameters<typeof defineWebSocketHandler>[0];
type WsPeer = WsHooks extends { open?: (peer: infer P) => unknown } ? P : never;
type WsMessage = WsHooks extends {
  message?: (peer: WsPeer, message: infer M) => unknown;
}
  ? M
  : never;

interface PeerSession {
  userId: number;
  branchId: number;
  role: Role;
  sessionClass: "app" | "pre_auth";
  onboardingCompleted: boolean;
}

interface SubscribeMessage {
  type: "subscribe" | "unsubscribe";
  jobId: number;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readCookieMap(header: string | null): ReadonlyMap<string, string> {
  if (!header) {
    return new Map();
  }

  return new Map(
    header
      .split(";")
      .map((pair) => {
        const separator = pair.indexOf("=");
        if (separator < 0) {
          return null;
        }

        const key = pair.slice(0, separator).trim();
        const value = decodeURIComponent(pair.slice(separator + 1).trim());
        return [key, value] as const;
      })
      .filter((entry): entry is readonly [string, string] => entry !== null),
  );
}

function parseMessage(rawText: string): SubscribeMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return null;
  }

  if (!isObjectRecord(parsed)) {
    return null;
  }

  const { type, jobId } = parsed;
  if (
    (type !== "subscribe" && type !== "unsubscribe") ||
    typeof jobId !== "number" ||
    !Number.isFinite(jobId) ||
    jobId <= 0
  ) {
    return null;
  }

  return {
    type,
    jobId: Math.trunc(jobId),
  };
}

function readSessionFromPeerContext(peer: WsPeer): PeerSession | null {
  const session = peer.context.session;
  if (!isObjectRecord(session)) {
    return null;
  }

  const { userId, branchId, role, sessionClass, onboardingCompleted } = session;
  if (
    typeof userId !== "number" ||
    typeof branchId !== "number" ||
    (role !== "executive" &&
      role !== "supervisor" &&
      role !== "back_office" &&
      role !== "sales_manager" &&
      role !== "logistics" &&
      role !== "hr" &&
      role !== "admin" &&
      role !== "superuser") ||
    (sessionClass !== "app" && sessionClass !== "pre_auth") ||
    typeof onboardingCompleted !== "boolean"
  ) {
    return null;
  }

  return {
    userId,
    branchId,
    role,
    sessionClass,
    onboardingCompleted,
  };
}

async function resolvePeerSession(peer: WsPeer): Promise<PeerSession | null> {
  const cookieHeader = peer.request.headers.get("cookie") ?? null;
  const sessionToken = readCookieMap(cookieHeader).get("session");
  if (!sessionToken) {
    return null;
  }

  const validation =
    await serverRuntime.auth.sessionService.validateSessionToken(sessionToken);
  if (!validation.session) {
    return null;
  }

  return {
    userId: validation.session.userId,
    branchId: validation.session.branchId,
    role: validation.session.role,
    sessionClass: validation.session.sessionClass,
    onboardingCompleted: validation.session.onboardingCompleted,
  };
}

function messageToText(message: WsMessage): string {
  if (
    typeof message === "object" &&
    message !== null &&
    "text" in message &&
    typeof message.text === "function"
  ) {
    return message.text();
  }

  return String(message);
}

export default defineWebSocketHandler({
  async open(peer: WsPeer) {
    await ensureLeadsImportsProgressBridge();

    const session = await resolvePeerSession(peer);
    if (
      !session ||
      session.sessionClass !== "app" ||
      !session.onboardingCompleted ||
      !hasPermission(session.role, "integration:manage")
    ) {
      peer.close();
      return;
    }

    peer.context.session = session;
  },

  async message(peer: WsPeer, message: WsMessage) {
    const session = readSessionFromPeerContext(peer);
    if (!session) {
      peer.close();
      return;
    }

    const parsed = parseMessage(messageToText(message));
    if (!parsed) {
      return;
    }

    const bridge = await ensureLeadsImportsProgressBridge();

    if (parsed.type === "unsubscribe") {
      bridge.unsubscribe(peer, parsed.jobId);
      return;
    }

    const job = await serverRuntime.integrations.integration.jobs.findById(
      parsed.jobId,
    );
    if (
      !job ||
      (job.type !== "import_status" && job.type !== "import_prioridad")
    ) {
      return;
    }

    const authorized = await canAccessLeadImportJob(
      {
        userId: session.userId,
        branchId: session.branchId,
        role: session.role,
      },
      job,
      serverRuntime.integrations.integration,
    );
    if (!authorized) {
      return;
    }

    bridge.subscribe(peer, parsed.jobId);
    peer.send(JSON.stringify(buildLeadImportProgressEvent({ job })));
  },

  async close(peer: WsPeer) {
    const bridge = await ensureLeadsImportsProgressBridge();
    bridge.removePeer(peer);
  },
});
