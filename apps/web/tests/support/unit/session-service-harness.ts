import { vi } from "vitest";

import type { UserSessionRow } from "~/lib/auth/types";
import type {
  SessionEventPort,
  SessionRepositoryPort,
  SessionUsersPort,
} from "~/server/auth/session/session-spec";
import { createSessionService } from "~/server/auth/session/session.service";

export type SessionStore = Map<string, UserSessionRow>;

const noopDeactivateIfExpired: SessionUsersPort["deactivateIfExpired"] =
  async () => false;
const noopUpdateActivity: SessionRepositoryPort["updateActivity"] =
  async () => {};
const noopExtendExpiry: SessionRepositoryPort["extendExpiry"] = async () => {};

export function createSessionServiceHarness(
  nowTs: number,
  store: SessionStore,
) {
  const usersFindById = vi.fn<SessionUsersPort["findById"]>(async (userId) => ({
    id: userId,
    is_active: 1,
    expires_at: null,
  }));
  const usersDeactivateIfExpired = noopDeactivateIfExpired;
  const sessionsDelete = vi.fn<SessionRepositoryPort["delete"]>(async (id) => {
    store.delete(id);
  });
  const sessionsDeleteAllForUser = vi.fn<
    SessionRepositoryPort["deleteAllForUser"]
  >(async (userId) => {
    for (const [id, row] of store.entries()) {
      if (row.user_id === userId) {
        store.delete(id);
      }
    }
  });
  const sessionsFindById = vi.fn<SessionRepositoryPort["findById"]>(
    async (id) => store.get(id) ?? null,
  );

  const sessions: SessionRepositoryPort = {
    async create(session) {
      store.set(session.id, session);
    },
    findById: sessionsFindById,
    updateActivity: noopUpdateActivity,
    extendExpiry: noopExtendExpiry,
    delete: sessionsDelete,
    deleteAllForUser: sessionsDeleteAllForUser,
  };

  const users: SessionUsersPort = {
    findById: usersFindById,
    deactivateIfExpired: usersDeactivateIfExpired,
  };

  const events: SessionEventPort = {
    async append() {
      return [];
    },
  };

  const service = createSessionService({
    sessions,
    users,
    events,
    now: () => nowTs,
    logger: { error() {} },
  });

  return {
    service,
    spies: {
      usersFindById,
      sessionsDelete,
      sessionsDeleteAllForUser,
      sessionsFindById,
    },
  };
}
