import { describe, expect, it } from "vitest";

import { buildEngineClientConfig } from "~/server/shared/engine/config";

const VALID_HMAC = {
  engineHmacKeyId: "web",
  engineHmacSecret: "k7vB9pL2mN5qR4xT1yZ8wS3uJ6hA0gC9",
  engineTimeoutMs: "5000",
} as const;

describe("engine client config", () => {
  it("defaults local mode to a loopback http endpoint", () => {
    const config = buildEngineClientConfig({
      engineConnectMode: "local",
      engineUrl: "http://127.0.0.1:3001/",
      ...VALID_HMAC,
    });

    expect(config.baseUrl).toBe("http://127.0.0.1:3001");
  });

  it("accepts localhost and IPv6 loopback in local mode", () => {
    expect(() =>
      buildEngineClientConfig({
        engineConnectMode: "local",
        engineUrl: "http://localhost:3001",
        ...VALID_HMAC,
      }),
    ).not.toThrow();

    expect(() =>
      buildEngineClientConfig({
        engineConnectMode: "local",
        engineUrl: "http://[::1]:3001",
        ...VALID_HMAC,
      }),
    ).not.toThrow();
  });

  it("rejects non-loopback targets in local mode", () => {
    expect(() =>
      buildEngineClientConfig({
        engineConnectMode: "local",
        engineUrl: "http://engine.internal:3001",
        ...VALID_HMAC,
      }),
    ).toThrow("ENGINE_URL must target a loopback host in local mode");
  });

  it("rejects https in local mode", () => {
    expect(() =>
      buildEngineClientConfig({
        engineConnectMode: "local",
        engineUrl: "https://127.0.0.1:3001",
        ...VALID_HMAC,
      }),
    ).toThrow("ENGINE_URL must use http in local mode");
  });

  it("requires https and a non-loopback host in remote mode", () => {
    expect(() =>
      buildEngineClientConfig({
        engineConnectMode: "remote",
        engineUrl: "https://engine.example.com",
        ...VALID_HMAC,
      }),
    ).not.toThrow();

    expect(() =>
      buildEngineClientConfig({
        engineConnectMode: "remote",
        engineUrl: "http://engine.example.com",
        ...VALID_HMAC,
      }),
    ).toThrow("ENGINE_URL must use https in remote mode");

    expect(() =>
      buildEngineClientConfig({
        engineConnectMode: "remote",
        engineUrl: "https://127.0.0.1:3001",
        ...VALID_HMAC,
      }),
    ).toThrow("ENGINE_URL must not target a loopback host in remote mode");
  });

  it("rejects credentials, query params, and fragments", () => {
    expect(() =>
      buildEngineClientConfig({
        engineConnectMode: "remote",
        engineUrl: "https://user:pass@engine.example.com",
        ...VALID_HMAC,
      }),
    ).toThrow("ENGINE_URL must not include credentials");

    expect(() =>
      buildEngineClientConfig({
        engineConnectMode: "remote",
        engineUrl: "https://engine.example.com?q=1",
        ...VALID_HMAC,
      }),
    ).toThrow("ENGINE_URL must not include query params or fragments");

    expect(() =>
      buildEngineClientConfig({
        engineConnectMode: "remote",
        engineUrl: "https://engine.example.com#frag",
        ...VALID_HMAC,
      }),
    ).toThrow("ENGINE_URL must not include query params or fragments");
  });

  it("rejects invalid timeout values", () => {
    expect(() =>
      buildEngineClientConfig({
        ...VALID_HMAC,
        engineConnectMode: "local",
        engineUrl: "http://127.0.0.1:3001",
        engineTimeoutMs: "not-a-number",
      }),
    ).toThrow("ENGINE_TIMEOUT_MS must be a positive integer");

    expect(() =>
      buildEngineClientConfig({
        ...VALID_HMAC,
        engineConnectMode: "local",
        engineUrl: "http://127.0.0.1:3001",
        engineTimeoutMs: "0",
      }),
    ).toThrow("ENGINE_TIMEOUT_MS must be a positive integer");

    expect(() =>
      buildEngineClientConfig({
        ...VALID_HMAC,
        engineConnectMode: "local",
        engineUrl: "http://127.0.0.1:3001",
        engineTimeoutMs: "-100",
      }),
    ).toThrow("ENGINE_TIMEOUT_MS must be a positive integer");

    expect(() =>
      buildEngineClientConfig({
        ...VALID_HMAC,
        engineConnectMode: "local",
        engineUrl: "http://127.0.0.1:3001",
        engineTimeoutMs: "5000ms",
      }),
    ).toThrow("ENGINE_TIMEOUT_MS must be a positive integer");

    expect(() =>
      buildEngineClientConfig({
        ...VALID_HMAC,
        engineConnectMode: "local",
        engineUrl: "http://127.0.0.1:3001",
        engineTimeoutMs: "5.5",
      }),
    ).toThrow("ENGINE_TIMEOUT_MS must be a positive integer");

    expect(() =>
      buildEngineClientConfig({
        ...VALID_HMAC,
        engineConnectMode: "local",
        engineUrl: "http://127.0.0.1:3001",
        engineTimeoutMs: " 5000 ",
      }),
    ).not.toThrow();
  });
});
