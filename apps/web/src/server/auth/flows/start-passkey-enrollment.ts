import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import {
  persistPasskeyEnrollmentChallenge,
  preparePasskeyEnrollment,
} from "~/server/auth/factors/passkey/service";
import type { AuthSetupContext } from "~/server/auth/infrastructure/setup-context";
import type { UserId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

export async function startPasskeyEnrollment(
  deps: AuthSetupContext,
  input: {
    userId: UserId;
    ipAddress: string;
    occurredAt: Date;
    webauthnProvider: WebauthnProvider;
  },
) {
  const prepared = await preparePasskeyEnrollment(
    deps.repos,
    input.webauthnProvider,
    {
      userId: input.userId,
      ipAddress: input.ipAddress,
      occurredAt: input.occurredAt,
    },
  );
  if (isErr(prepared)) return prepared;

  return deps.uow.run((repos) =>
    persistPasskeyEnrollmentChallenge(repos, prepared.value),
  );
}
