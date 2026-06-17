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
    SEQUENTIAL_CHARS.split("").toReversed().join("").includes(value)
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

function parseSessionEnv(source: EnvSource) {
  return {
    sessionSecret: required(source, "SESSION_SECRET", true),
  } as const;
}

function parseTotpEnv(source: EnvSource) {
  return {
    totpEncryptionKey: required(source, "TOTP_ENCRYPTION_KEY", true),
  } as const;
}

function parseExtensionEnv(source: EnvSource) {
  return {
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
  } as const;
}

function parseSecurityEnv(source: EnvSource) {
  return {
    trustedProxy: optional(source, "TRUSTED_PROXY", "false"),
  } as const;
}

function parseUploadsEnv(source: EnvSource) {
  return {
    storageRoot: optional(
      source,
      "WEB_UPLOADS_ROOT",
      ".local-storage/documents",
    ),
  } as const;
}

function parseEngineEnv(source: EnvSource) {
  return {
    engineConnectMode: optionalEnum(
      source,
      "ENGINE_CONNECT_MODE",
      ["local", "remote"] as const,
      "local",
    ),
    engineUrl: optional(source, "ENGINE_URL", "http://127.0.0.1:3001"),
    engineHmacKeyId: required(source, "ENGINE_HMAC_KEY_ID"),
    engineHmacSecret: required(source, "ENGINE_HMAC_SECRET", true),
    engineTimeoutMs: optional(source, "ENGINE_TIMEOUT_MS", "5000"),
  } as const;
}

function parseGoogleOAuthEnv(source: EnvSource) {
  return {
    googleClientId: required(source, "GOOGLE_CLIENT_ID"),
    googleClientSecret: required(source, "GOOGLE_CLIENT_SECRET"),
    googleRedirectUri: required(source, "GOOGLE_REDIRECT_URI"),
  } as const;
}

function parseNotificationsEnv(source: EnvSource) {
  return {
    resendApiKey: required(source, "RESEND_API_KEY"),
    emailFrom: required(source, "EMAIL_FROM"),
    whatsappAccessToken: optional(source, "WHATSAPP_ACCESS_TOKEN", ""),
    whatsappPhoneNumberId: optional(source, "WHATSAPP_PHONE_NUMBER_ID", ""),
    whatsappApiVersion: optional(source, "WHATSAPP_GRAPH_API_VERSION", "v23.0"),
  } as const;
}

function sentryIngestHostFromDsn(dsn: string): string {
  try {
    return new URL(dsn).host;
  } catch {
    return "";
  }
}

function parseSentryEnv(source: EnvSource) {
  const sentryDsn = optional(source, "VITE_SENTRY_DSN", "");
  return {
    sentryDsn,
    sentryIngestHost: sentryDsn ? sentryIngestHostFromDsn(sentryDsn) : "",
    sentryTraceSampleRate: optional(source, "SENTRY_TRACES_SAMPLE_RATE", "0.1"),
  } as const;
}

export function loadServerEnv(source: EnvSource) {
  return {
    session: parseSessionEnv(source),
    totp: parseTotpEnv(source),
    extension: parseExtensionEnv(source),
    security: parseSecurityEnv(source),
    uploads: parseUploadsEnv(source),
    engine: parseEngineEnv(source),
    googleOAuth: parseGoogleOAuthEnv(source),
    notifications: parseNotificationsEnv(source),
    sentry: parseSentryEnv(source),
  } as const;
}

export type ServerEnv = ReturnType<typeof loadServerEnv>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (process.env.NODE_ENV === "test") {
    return loadServerEnv(process.env);
  }
  cached ??= loadServerEnv(process.env);
  return cached;
}
