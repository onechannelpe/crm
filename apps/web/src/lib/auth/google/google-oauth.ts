import { decodeIdToken, Google } from "arctic";

import { env } from "~/lib/env";
import { Err, Ok, type Result } from "~/server/shared/result";

export const googleOAuth = new Google(
  env.googleClientId,
  env.googleClientSecret,
  env.googleRedirectUri,
);

export interface GoogleIdTokenClaims {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function parseGoogleClaims(claims: unknown): GoogleIdTokenClaims {
  if (!isRecord(claims)) {
    throw new Error("Invalid Google ID token claims");
  }

  const { sub, email, name, picture } = claims;

  if (typeof sub !== "string" || typeof email !== "string") {
    throw new Error("Invalid Google ID token claims: missing sub or email");
  }

  return {
    sub,
    email,
    name: typeof name === "string" ? name : email,
    picture: typeof picture === "string" ? picture : undefined,
  };
}

export async function authenticateGoogleAuthorizationCode(input: {
  code: string;
  codeVerifier: string;
}): Promise<
  Result<
    GoogleIdTokenClaims,
    {
      kind: "invalid_google_callback";
    }
  >
> {
  try {
    const tokens = await googleOAuth.validateAuthorizationCode(
      input.code,
      input.codeVerifier,
    );
    const claims = parseGoogleClaims(decodeIdToken(tokens.idToken()));
    return Ok(claims);
  } catch {
    return Err({ kind: "invalid_google_callback" });
  }
}
