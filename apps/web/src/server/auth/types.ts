import type { Selectable } from "kysely";

import type { UserId } from "~/domain/ids";
import type { Database, UsersTable } from "~/server/platform/database/types";

import type {
  StrongAuthPasskeysPort,
  StrongAuthTotpFactorsPort,
} from "./security/strong-auth-status";

export type UserSessionRow = Selectable<Database["user_sessions"]>;

export interface AuthContextUsersPort {
  findById(userId: UserId): Promise<Selectable<UsersTable> | undefined>;
}

export interface AuthContextDeps {
  users: AuthContextUsersPort;
  passkeys: StrongAuthPasskeysPort;
  userTotpFactors: StrongAuthTotpFactorsPort;
  userRecoveryCodes: {
    getActiveSet(
      userId: UserId,
    ): Promise<{ acknowledgedAt: Date | null } | null>;
  };
}
