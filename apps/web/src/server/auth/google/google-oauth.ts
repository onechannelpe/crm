import { decodeIdToken, Google } from "arctic";

import { googleOAuthConfig } from "~/server/platform/config/env";
import { Err, Ok, type Result } from "~/shared/result";
import { isPlainRecord } from "~/shared/type-guards";

let googleOAuth: Google | undefined;

export function getGoogleOAuth(): Google {
  const env = googleOAuthConfig();
  googleOAuth ??= new Google(
    env.googleClientId,
    env.googleClientSecret,
    env.googleRedirectUri,
  );
  return googleOAuth;
}

export interface GoogleIdTokenClaims {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

function parseGoogleClaims(claims: unknown): GoogleIdTokenClaims {
  if (!isPlainRecord(claims)) {
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
    const tokens = await getGoogleOAuth().validateAuthorizationCode(
      input.code,
      input.codeVerifier,
    );
    const claims = parseGoogleClaims(decodeIdToken(tokens.idToken()));
    return Ok(claims);
  } catch {
    return Err({ kind: "invalid_google_callback" });
  }
}
