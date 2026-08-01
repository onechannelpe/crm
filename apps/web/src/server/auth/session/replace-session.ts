import type { AuthSession } from "~/domain/auth/access/session-types";

import type {
  SessionServiceDeps,
  SessionSpec,
  SessionUser,
} from "./session-spec";
import { createSessionService } from "./session.service";

type ReplacementSessionRepos = Pick<
  SessionServiceDeps,
  "events" | "sessions" | "users"
>;

export async function replaceSession(
  repos: ReplacementSessionRepos,
  input: {
    current: AuthSession;
    user: SessionUser;
    sessionClass: SessionSpec["sessionClass"];
    strongAuthMethod: SessionSpec["strongAuthMethod"];
    strongAuthAt: Date | null;
    ipAddress: string;
    userAgent: string | null;
    issuedAt: Date;
  },
): Promise<string> {
  const sessionService = createSessionService({
    sessions: repos.sessions,
    users: repos.users,
    events: repos.events,
  });
  const issued = await sessionService.establish(
    {
      user: input.user,
      sessionClass: input.sessionClass,
      request: {
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
      primaryAuthMethod: input.current.primaryAuthMethod,
      strongAuthMethod: input.strongAuthMethod,
      strongAuthAt: input.strongAuthAt,
    },
    input.issuedAt,
  );

  await sessionService.revoke(input.current.id);
  return issued.token;
}
