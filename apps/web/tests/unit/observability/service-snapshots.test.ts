import { afterEach, describe, expect, it, vi } from "vitest";

import { UserId } from "~/domain/ids";
import { createObservabilityService } from "~/server/observability/service";
import { isErr } from "~/shared/result";

function createUnexpectedRepos() {
  return {
    actionObservations: {
      create: () => {
        throw new Error("unexpected action observation write");
      },
      findRecent: () => {
        throw new Error("unexpected action observations read");
      },
      summarizeByAction: () => {
        throw new Error("unexpected action observations summary");
      },
      deleteCreatedBefore: () => Promise.resolve(0),
    },
    authFunnelEvents: {
      create: () => {
        throw new Error("unexpected auth funnel write");
      },
      findRecent: () => {
        throw new Error("unexpected auth funnel read");
      },
      summarize: () => {
        throw new Error("unexpected auth funnel summary");
      },
      deleteCreatedBefore: () => Promise.resolve(0),
    },
  } satisfies Parameters<typeof createObservabilityService>[0];
}

describe("observability service snapshots", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("rejects invalid action snapshot filters before querying repos", async () => {
    const service = createObservabilityService(createUnexpectedRepos());

    const result = await service.getActionSnapshot(
      { status: "pending" },
      new Date(),
    );

    expect(isErr(result)).toBe(true);
    expect(isErr(result) && result.error.code).toBe("invalid_status");
  });

  it("normalizes action snapshot filters and projects action rows", async () => {
    const now = new Date(1_700_000_000_000);
    const fromInclusive = new Date(now.getTime() - 120 * 60_000);
    const toInclusive = now;
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const service = createObservabilityService({
      actionObservations: {
        create: () => {
          throw new Error("unexpected action observation write");
        },
        summarizeByAction: async (filter) => {
          expect(filter).toMatchObject({
            fromInclusive,
            toInclusive,
            actionName: "team.invite.create",
            status: "error",
          });

          return [
            {
              action_name: "team.invite.create",
              count: 2,
              error_count: 1,
              avg_duration_ms: 10.5,
              max_duration_ms: 15,
            },
          ];
        },
        findRecent: async (filter) => {
          expect(filter).toMatchObject({
            fromInclusive,
            toInclusive,
            actionName: "team.invite.create",
            status: "error",
            limit: 25,
          });

          return [
            {
              id: "7",
              trace_id: "trace",
              request_id: "request",
              route_path: "/team/invite",
              http_method: "POST",
              action_name: "team.invite.create",
              actor_user_id: UserId.trust("5"),
              actor_role: "superuser",
              status: "error",
              duration_ms: 15,
              error_code: "validation_failed",
              error_category: "validation",
              public_error: "Validation failed",
              is_sensitive: false,
              input_summary: null,
              created_at: new Date(now),
            },
          ];
        },
        deleteCreatedBefore: () => Promise.resolve(0),
      },
      authFunnelEvents: createUnexpectedRepos().authFunnelEvents,
    } satisfies Parameters<typeof createObservabilityService>[0]);

    const result = await service.getActionSnapshot(
      {
        windowMinutes: 120,
        limit: 25,
        actionName: " team.invite.create ",
        status: "error",
      },
      now,
    );

    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      return;
    }

    expect(result.value).toEqual({
      windowMinutes: 120,
      summary: [
        {
          actionName: "team.invite.create",
          count: 2,
          errorCount: 1,
          avgDurationMs: 10.5,
          maxDurationMs: 15,
        },
      ],
      recent: [
        {
          id: "7",
          createdAt: now.getTime(),
          actionName: "team.invite.create",
          status: "error",
          durationMs: 15,
          actorUserId: UserId.trust("5"),
          actorRole: "superuser",
          routePath: "/team/invite",
          errorCode: "validation_failed",
          errorCategory: "validation",
          publicError: "Validation failed",
          isSensitive: false,
        },
      ],
    });
  });

  it("rejects invalid auth funnel filters before querying repos", async () => {
    const service = createObservabilityService(createUnexpectedRepos());

    const result = await service.getAuthFunnelSnapshot(
      { eventName: "login" },
      new Date(),
    );

    expect(isErr(result)).toBe(true);
    expect(isErr(result) && result.error.code).toBe("invalid_event_name");
  });

  it("normalizes auth funnel filters and projects event rows", async () => {
    const now = new Date(1_700_000_000_000);
    const fromInclusive = new Date(now.getTime() - 30 * 60_000);
    const toInclusive = now;
    vi.useFakeTimers();
    vi.setSystemTime(now);

    const service = createObservabilityService({
      actionObservations: createUnexpectedRepos().actionObservations,
      authFunnelEvents: {
        create: () => {
          throw new Error("unexpected auth funnel write");
        },
        summarize: async (filter) => {
          expect(filter).toMatchObject({
            fromInclusive,
            toInclusive,
            eventName: "password_result",
            method: "password",
            outcome: "failed",
          });

          return [
            {
              event_name: "password_result",
              screen: null,
              method: "password",
              outcome: "failed",
              source: "server",
              count: 1,
            },
          ];
        },
        findRecent: async (filter) => {
          expect(filter).toMatchObject({
            fromInclusive,
            toInclusive,
            eventName: "password_result",
            method: "password",
            outcome: "failed",
            limit: 10,
          });

          return [
            {
              id: "9",
              trace_id: "trace",
              request_id: "request",
              route_path: "/_server",
              source: "server",
              event_name: "password_result",
              screen: null,
              method: "password",
              outcome: "failed",
              code: "invalid_credentials",
              created_at: new Date(now),
            },
          ];
        },
        deleteCreatedBefore: () => Promise.resolve(0),
      },
    } satisfies Parameters<typeof createObservabilityService>[0]);

    const result = await service.getAuthFunnelSnapshot(
      {
        windowMinutes: 30,
        limit: 10,
        eventName: "password_result",
        method: "password",
        outcome: "failed",
      },
      now,
    );

    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      return;
    }

    expect(result.value).toEqual({
      windowMinutes: 30,
      summary: [
        {
          eventName: "password_result",
          screen: null,
          method: "password",
          outcome: "failed",
          source: "server",
          count: 1,
        },
      ],
      recent: [
        {
          id: "9",
          createdAt: now.getTime(),
          eventName: "password_result",
          screen: null,
          method: "password",
          outcome: "failed",
          source: "server",
          routePath: "/_server",
          code: "invalid_credentials",
        },
      ],
    });
  });
});
