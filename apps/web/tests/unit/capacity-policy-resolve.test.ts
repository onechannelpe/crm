import { describe, expect, it } from "vitest";

import {
  resolveLeadPolicy,
  resolveSearchPolicy,
} from "~/server/capacity/domain/policy";

describe("resolveSearchPolicy", () => {
  it("source is user when user override is present", () => {
    const policy = resolveSearchPolicy({
      userOverride: { search_limit: 100 },
      teamDefault: { search_limit: 50 },
      branchDefault: { search_limit: 25 },
    });
    expect(policy.source).toBe("user");
    expect(policy.monthlyLimit).toBe(100);
  });

  it("source is team when no user override but team default is present", () => {
    const policy = resolveSearchPolicy({
      userOverride: null,
      teamDefault: { search_limit: 50 },
      branchDefault: { search_limit: 25 },
    });
    expect(policy.source).toBe("team");
    expect(policy.monthlyLimit).toBe(50);
  });

  it("source is branch when only branch default is present", () => {
    const policy = resolveSearchPolicy({
      userOverride: null,
      teamDefault: null,
      branchDefault: { search_limit: 25 },
    });
    expect(policy.source).toBe("branch");
    expect(policy.monthlyLimit).toBe(25);
  });

  it("source is system when all overrides are absent", () => {
    const policy = resolveSearchPolicy({
      userOverride: null,
      teamDefault: null,
      branchDefault: null,
    });
    expect(policy.source).toBe("system");
    // System limit is usually hardcoded or coming from a default config
    expect(policy.monthlyLimit).toBeDefined();
  });
});

describe("resolveLeadPolicy", () => {
  it("source is user when user override is present", () => {
    const policy = resolveLeadPolicy({
      userOverride: { active_buffer_target: 10, daily_refill_limit: 5 },
      teamDefault: { active_buffer_target: 8, daily_refill_limit: 4 },
      branchDefault: { active_buffer_target: 6, daily_refill_limit: 3 },
    });
    expect(policy.source).toBe("user");
    expect(policy.bufferTarget).toBe(10);
    expect(policy.dailyLimit).toBe(5);
  });

  it("source is team when no user override but team default is present", () => {
    const policy = resolveLeadPolicy({
      userOverride: null,
      teamDefault: { active_buffer_target: 8, daily_refill_limit: 4 },
      branchDefault: { active_buffer_target: 6, daily_refill_limit: 3 },
    });
    expect(policy.source).toBe("team");
    expect(policy.bufferTarget).toBe(8);
  });

  it("source is system when all overrides are absent", () => {
    const policy = resolveLeadPolicy({
      userOverride: null,
      teamDefault: null,
      branchDefault: null,
    });
    expect(policy.source).toBe("system");
  });
});
