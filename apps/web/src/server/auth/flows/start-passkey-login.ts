import type { WebauthnProvider } from "~/server/auth/factors/passkey-provider";
import {
  persistPasskeyLoginFlow,
  preparePasskeyLogin,
} from "~/server/auth/factors/passkey/service";
import type { OperationContext } from "~/server/platform/operation/context";
import { isErr, Ok } from "~/shared/result";

import type { AuthLoginContext } from "../infrastructure/login-context";

type StartPasskeyLoginInput =
  | {
      identifier: string;
      ipAddress: string;
      mode: "identified";
      primaryAuthMethod?: "password" | "google" | "passkey";
    }
  | {
      ipAddress: string;
      mode: "discoverable";
      primaryAuthMethod?: "passkey";
    };

export async function startPasskeyLogin(
  input: StartPasskeyLoginInput,
  deps: AuthLoginContext,
  webauthnProvider: WebauthnProvider,
  operation: OperationContext,
) {
  const prepared = await preparePasskeyLogin(
    deps.repos,
    webauthnProvider,
    input.mode === "identified"
      ? {
          identifier: input.identifier,
          ipAddress: input.ipAddress,
          mode: input.mode,
          primaryAuthMethod: input.primaryAuthMethod,
          occurredAt: operation.operationAt,
          account: { kind: "lookup" },
        }
      : {
          ipAddress: input.ipAddress,
          mode: input.mode,
          primaryAuthMethod: input.primaryAuthMethod,
          occurredAt: operation.operationAt,
        },
  );
  if (isErr(prepared)) {
    return prepared;
  }

  return deps.uow.run(async (repos) =>
    Ok(await persistPasskeyLoginFlow(repos, prepared.value)),
  );
}
