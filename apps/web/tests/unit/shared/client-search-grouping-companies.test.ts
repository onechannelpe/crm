import { makeSearchRow } from "@tests/support/shared/search-row";
import { describe, expect, it } from "vitest";

import { groupCompaniesByRuc } from "~/features/search/model/grouping";

describe("client search grouping companies", () => {
  it("groups companies by ruc and aggregates people and phones", () => {
    const groups = groupCompaniesByRuc([
      makeSearchRow({
        dni: "12345678",
        name: "RICARDO GARCIA PINCHI",
        org_ruc: "20100000001",
        org_name: "ACME SAC",
        phone_primary: "999111222",
      }),
      makeSearchRow({
        dni: "87654321",
        name: "MARIA LOPEZ",
        org_ruc: "20100000001",
        org_name: "ACME SAC",
        phone_secondary: "999333444",
      }),
      makeSearchRow({
        dni: "12345678",
        name: "GARCIA PINCHI RICARDO",
        org_ruc: "20100000001",
        org_name: "ACME SAC",
        phone_secondary: "999777888",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.ruc).toBe("20100000001");
    expect(groups[0]?.name).toBe("ACME SAC");
    expect(groups[0]?.people).toEqual([
      { dni: "12345678", name: "RICARDO GARCIA PINCHI" },
      { dni: "87654321", name: "MARIA LOPEZ" },
    ]);
    expect(groups[0]?.phones).toEqual(["999111222", "999333444", "999777888"]);
  });

  it("does not merge entries when org_ruc is missing", () => {
    const groups = groupCompaniesByRuc([
      makeSearchRow({
        dni: "11111111",
        name: "A",
        org_ruc: null,
        org_name: null,
        phone_primary: "999111111",
      }),
      makeSearchRow({
        dni: "11111111",
        name: "A",
        org_ruc: null,
        org_name: null,
        phone_primary: "999111111",
      }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups[0]?.ruc).toBeNull();
    expect(groups[1]?.ruc).toBeNull();
  });

  it("aggregates and deduplicates emails per company", () => {
    const groups = groupCompaniesByRuc([
      makeSearchRow({
        dni: "12345678",
        org_ruc: "20100000001",
        email: "juan@gmail.com",
      }),
      makeSearchRow({
        dni: "87654321",
        org_ruc: "20100000001",
        email: "maria@hotmail.com",
      }),
      makeSearchRow({
        dni: "12345678",
        org_ruc: "20100000001",
        email: "juan@gmail.com",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.emails).toEqual(["juan@gmail.com", "maria@hotmail.com"]);
  });

  it("recovers company name from later rows", () => {
    const groups = groupCompaniesByRuc([
      makeSearchRow({ org_ruc: "20100000001", org_name: null }),
      makeSearchRow({ org_ruc: "20100000001", org_name: "ACME SAC" }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.name).toBe("ACME SAC");
  });
});
