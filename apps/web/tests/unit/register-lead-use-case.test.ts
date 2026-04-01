import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  engineSearch: vi.fn<() => Promise<unknown>>(),
  findByRuc: vi.fn<() => Promise<unknown>>(),
  findById:
    vi.fn<() => Promise<{ id: number; is_active: number } | undefined>>(),
  insertLead: vi.fn<() => Promise<number>>(),
  insertAssignment: vi.fn<() => Promise<void>>(),
  logAudit: vi.fn<() => Promise<void>>(),
}));

vi.mock("../../src/server/shared/composition-root", () => ({
  engineClient: {
    search: mocks.engineSearch,
  },
}));

vi.mock("../../src/server/lead-pipeline/infrastructure/repos", () => ({
  createLeadPipelineRepos: () => ({
    leads: {
      findByRuc: mocks.findByRuc,
      insert: mocks.insertLead,
    },
    leadAssignments: {
      insert: mocks.insertAssignment,
    },
    users: {
      findById: mocks.findById,
    },
  }),
}));

vi.mock("../../src/server/shared/pipeline-runtime", () => ({
  pipelineAuditService: {
    log: mocks.logAudit,
  },
}));

vi.mock("../../src/server/shared/pipeline-transaction", () => ({
  runInPipelineTransaction: async (
    operation: (params: {
      executor: object;
      afterCommit: (callback: () => Promise<void>) => void;
    }) => Promise<unknown>,
  ) => {
    const callbacks: Array<() => Promise<void>> = [];
    const result = await operation({
      executor: {},
      afterCommit: (callback) => callbacks.push(callback),
    });

    for (const callback of callbacks) {
      await callback();
    }

    return result;
  },
}));

import { createLead } from "../../src/server/lead-pipeline/application/lead-commands";

describe("createLead", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findByRuc.mockResolvedValue(undefined);
    mocks.findById.mockResolvedValue({ id: 7, is_active: 1 });
    mocks.insertLead.mockResolvedValue(41);
    mocks.insertAssignment.mockResolvedValue(undefined);
    mocks.logAudit.mockResolvedValue(undefined);
  });

  it("fills legal name and address from engine search when RUC data is available", async () => {
    mocks.engineSearch.mockResolvedValue({
      ok: true,
      value: [
        {
          person: {
            dni: "00000000",
            name: null,
            ruc: null,
            birth_date: null,
            birth_place: null,
            sex: null,
            marital_status: null,
            location_text: null,
            ubigeo_code: null,
            mother_name: null,
            father_name: null,
            email: null,
          },
          org: {
            ruc: "20100000001",
            name: "Acme SAC",
            trade_name: null,
            company_type: null,
            status: null,
            condition: null,
            fiscal_address: "Av. Lima 123",
            registration_date: null,
            activity_start_date: null,
            line_of_business: null,
            economic_activity: null,
            ubigeo_code: null,
            department: null,
            province: null,
            district: null,
          },
          role: null,
          phones: { primary: null, secondary: null, siblings: null },
        },
      ],
    });

    const result = await createLead({
      ruc: "20100000001",
      executiveId: 7,
      actorUserId: 7,
      actorRole: "admin",
    });

    expect(result.ok).toBe(true);
    expect(mocks.engineSearch).toHaveBeenCalledWith("ruc", "20100000001", 1);
    expect(mocks.insertLead).toHaveBeenCalledWith(
      expect.objectContaining({
        ruc: "20100000001",
        razon_social: "Acme SAC",
        address: "Av. Lima 123",
      }),
    );
  });

  it("keeps lead registration working when engine lookup fails", async () => {
    mocks.engineSearch.mockResolvedValue({
      ok: false,
      error: {
        kind: "unexpected",
        code: "engine_down",
        message: "engine down",
      },
    });

    const result = await createLead({
      ruc: "20100000001",
      executiveId: 7,
      actorUserId: 7,
      actorRole: "admin",
    });

    expect(result.ok).toBe(true);
    expect(mocks.insertLead).toHaveBeenCalledWith(
      expect.objectContaining({
        ruc: "20100000001",
        razon_social: null,
        address: null,
      }),
    );
  });
});
