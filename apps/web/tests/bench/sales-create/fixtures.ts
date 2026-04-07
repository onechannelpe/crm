import type { CreateSalesRecordDraftInput } from "~/server/sales-records/application/contracts";

import type { TestDbContext } from "../../support/test-db";
import { BENCH_NOW } from "../_shared/constants";

export const USER_POOL_SIZE = 96;
const USER_ID_START = 100_000;

export const SALES_CREATE_BASE_DRAFT_INPUT: CreateSalesRecordDraftInput = {
  source: "manual",
  leadAssignmentId: null,
  client: {
    ruc: "20100000001",
    companyName: "Org Lima",
    contactName: "Contacto Lima",
    dni: "70000001",
    phones: ["+51999999111"],
    engineMatchId: null,
    completenessScore: 75,
  },
  addresses: [
    {
      addressType: "installation",
      fullText: "Av. Demo 123",
      department: null,
      province: null,
      district: null,
      ubigeo: null,
      latitude: null,
      longitude: null,
      isPrimary: true,
    },
  ],
  products: [{ productId: 1, quantity: 1 }],
};

export async function seedSalesCreateUsers(
  ctx: TestDbContext,
): Promise<number[]> {
  const users = Array.from({ length: USER_POOL_SIZE }, (_, index) => ({
    id: USER_ID_START + index,
    branch_id: 1,
    team_id: null,
    username: `bench.sls${USER_ID_START + index}`,
    email: `bench-sales-create-${USER_ID_START + index}@test.local`,
    password_hash: "hash",
    names: `Bench Sales Create ${USER_ID_START + index}`,
    first_surname: "User",
    second_surname: "Bench",
    phone_e164: `+5199044${String(index).padStart(4, "0")}`,
    onboarding_completed_at: BENCH_NOW,
    role: "executive" as const,
    is_active: 1,
    created_at: BENCH_NOW,
  }));

  await ctx.db.insertInto("users").values(users).execute();
  return users.map((user) => user.id);
}
