function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  nodeEnv: optional("NODE_ENV", "development"),
  sessionSecret: required("SESSION_SECRET"),
  engineUrl: optional("ENGINE_URL", "http://localhost:3001"),
  engineHmacSecret: required("ENGINE_HMAC_SECRET"),
  webauthnRpId: optional("WEBAUTHN_RP_ID", "localhost"),
  webauthnOrigin: optional("WEBAUTHN_ORIGIN", "http://localhost:3000"),
  smtpHost: optional("SMTP_HOST", ""),
  smtpPort: Number(optional("SMTP_PORT", "587")),
  smtpUser: optional("SMTP_USER", ""),
  smtpPass: optional("SMTP_PASS", ""),
  smtpFrom: optional("SMTP_FROM", ""),
} as const;
