function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const env = {
  nodeEnv: getEnv("NODE_ENV", "development"),
  sessionSecret: getEnv("SESSION_SECRET"),
  searcherUrl: getEnv("SEARCHER_URL", "http://localhost:5000"),
  searcherApiKey: getEnv("SEARCHER_API_KEY"),
  webauthnRpId: getEnv("WEBAUTHN_RP_ID", "localhost"),
  webauthnOrigin: getEnv("WEBAUTHN_ORIGIN", "http://localhost:3000"),
} as const;
