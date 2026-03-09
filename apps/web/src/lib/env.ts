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

function required(key: string, secret = false): string {
  const value = process.env[key];
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

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  sessionSecret: required("SESSION_SECRET", true),
  totpEncryptionKey: required("TOTP_ENCRYPTION_KEY", true),
  extensionHandoffPrivateKeyPkcs8Base64: optional(
    "EXTENSION_HANDOFF_PRIVATE_KEY_PKCS8_BASE64",
    "",
  ),
  extensionExpectedOrigin: optional(
    "EXTENSION_EXPECTED_ORIGIN",
    "http://localhost:3000",
  ),
  trustedProxy: optional("TRUSTED_PROXY", "false"),
  engineUrl: optional("ENGINE_URL", "http://localhost:3001"),
  engineHmacKeyId: required("ENGINE_HMAC_KEY_ID"),
  engineHmacSecret: required("ENGINE_HMAC_SECRET", true),
  webauthnRpId: optional("WEBAUTHN_RP_ID", "localhost"),
  webauthnOrigin: optional("WEBAUTHN_ORIGIN", "http://localhost:3000"),
  googleClientId: optional("GOOGLE_CLIENT_ID", ""),
  googleClientSecret: optional("GOOGLE_CLIENT_SECRET", ""),
  googleRedirectUri: optional(
    "GOOGLE_REDIRECT_URI",
    "http://localhost:3000/api/auth/google/callback",
  ),
  resendApiKey: optional("RESEND_API_KEY", ""),
  emailFrom: optional("EMAIL_FROM", ""),
  whatsappAccessToken: optional("WHATSAPP_ACCESS_TOKEN", ""),
  whatsappPhoneNumberId: optional("WHATSAPP_PHONE_NUMBER_ID", ""),
  whatsappApiVersion: optional("WHATSAPP_GRAPH_API_VERSION", "v23.0"),
} as const;
