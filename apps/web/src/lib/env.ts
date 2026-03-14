const SECRET_MIN_LENGTH = 32;
const SECRET_MIN_UNIQUE_CHARS = 10;
const SEQUENTIAL_CHARS =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function validateSecret(key: string, value: string): void {
  if (value.length < SECRET_MIN_LENGTH) {
    throw new Error(
      `${key} must be at least ${SECRET_MIN_LENGTH} characters long`,
    );
  }

  if (/^(.)\1+$/.test(value)) {
    throw new Error(`${key} cannot be a repeating sequence of one character`);
  }

  if (
    SEQUENTIAL_CHARS.includes(value) ||
    SEQUENTIAL_CHARS.split("").reverse().join("").includes(value)
  ) {
    throw new Error(`${key} cannot be a simple sequential string`);
  }

  const uniqueChars = new Set(value).size;
  if (uniqueChars < SECRET_MIN_UNIQUE_CHARS) {
    throw new Error(
      `${key} has too little entropy (only ${uniqueChars} unique characters)`,
    );
  }
}

type EnvSource = Record<string, string | undefined>;

function required(env: EnvSource, key: string, secret = false): string {
  const value = env[key];
  if (!value) {
    let msg = `Missing required env: ${key}`;
    if (secret) {
      msg += `. Generate one with: openssl rand -base64 32`;
    }
    throw new Error(msg);
  }
  try {
    if (secret) validateSecret(key, value);
  } catch (e) {
    if (e instanceof Error) {
      e.message += ". Generate a new one with: openssl rand -base64 32";
    }
    throw e;
  }
  return value;
}

function optional(env: EnvSource, key: string, fallback: string): string {
  return env[key] ?? fallback;
}

function optionalEnum<const T extends readonly string[]>(
  env: EnvSource,
  key: string,
  values: T,
  fallback: T[number],
): T[number] {
  const value = env[key];
  if (!value) {
    return fallback;
  }

  if ((values as readonly string[]).includes(value)) {
    return value as T[number];
  }

  throw new Error(`${key} must be one of: ${values.join(", ")}`);
}

export function parseEnv(source: EnvSource) {
  return {
    nodeEnv: optional(source, "NODE_ENV", "development"),
    sessionSecret: required(source, "SESSION_SECRET", true),
    totpEncryptionKey: required(source, "TOTP_ENCRYPTION_KEY", true),
    extensionHandoffPrivateKeyPkcs8Base64: optional(
      source,
      "EXTENSION_HANDOFF_PRIVATE_KEY_PKCS8_BASE64",
      "",
    ),
    extensionExpectedOrigin: optional(
      source,
      "EXTENSION_EXPECTED_ORIGIN",
      "http://localhost:3000",
    ),
    trustedProxy: optional(source, "TRUSTED_PROXY", "false"),
    engineConnectMode: optionalEnum(
      source,
      "ENGINE_CONNECT_MODE",
      ["local", "remote"] as const,
      "local",
    ),
    engineUrl: optional(source, "ENGINE_URL", "http://127.0.0.1:3001"),
    engineHmacKeyId: required(source, "ENGINE_HMAC_KEY_ID"),
    engineHmacSecret: required(source, "ENGINE_HMAC_SECRET", true),
    webauthnRpId: optional(source, "WEBAUTHN_RP_ID", "localhost"),
    webauthnOrigin: optional(
      source,
      "WEBAUTHN_ORIGIN",
      "http://localhost:5173",
    ),
    googleClientId: optional(source, "GOOGLE_CLIENT_ID", ""),
    googleClientSecret: optional(source, "GOOGLE_CLIENT_SECRET", ""),
    googleRedirectUri: optional(
      source,
      "GOOGLE_REDIRECT_URI",
      "http://localhost:3000/api/auth/google/callback",
    ),
    resendApiKey: optional(source, "RESEND_API_KEY", ""),
    emailFrom: optional(source, "EMAIL_FROM", ""),
    whatsappAccessToken: optional(source, "WHATSAPP_ACCESS_TOKEN", ""),
    whatsappPhoneNumberId: optional(source, "WHATSAPP_PHONE_NUMBER_ID", ""),
    whatsappApiVersion: optional(source, "WHATSAPP_GRAPH_API_VERSION", "v23.0"),
  } as const;
}

export type AppEnv = ReturnType<typeof parseEnv>;

export const env = parseEnv(process.env);
