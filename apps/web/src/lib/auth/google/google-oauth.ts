import { Google } from "arctic";

import { env } from "~/lib/env";

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
