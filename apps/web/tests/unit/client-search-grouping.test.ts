import { describe, expect, it } from "vitest";

import {
  groupCompaniesByRuc,
  groupPeopleByDni,
} from "~/features/client-search/grouping";
import type { SearchResult } from "~/server/shared/engine/types";

function row(partial: {
  dni?: string;
  name?: string;
  phone_primary?: string | null;
  phone_secondary?: string | null;
  org_ruc?: string | null;
  org_name?: string | null;
  sibling_phones?: string[] | null;
}): SearchResult {
  const {
    dni = "12345678",
    name = "RICARDO GARCIA PINCHI",
    phone_primary = null,
    phone_secondary = null,
    org_ruc = null,
    org_name = null,
    sibling_phones = null,
  } = partial;
  return {
    person: {
      dni,
      name,
    },
    org:
      org_ruc != null
        ? {
            ruc: org_ruc,
            name: org_name,
          }
        : null,
    role: null,
    phones: {
      primary: phone_primary,
      secondary: phone_secondary,
      siblings: sibling_phones,
    },
  };
}

describe("client search grouping", () => {
  it("groups people by dni and keeps first name as displayName", () => {
    const groups = groupPeopleByDni([
      row({
        dni: "12345678",
        name: "RICARDO GARCIA PINCHI",
        org_ruc: "20100000001",
        org_name: "ACME SAC",
        phone_primary: "999111222",
      }),
      row({
        dni: "12345678",
        name: "GARCIA PINCHI RICARDO",
        org_ruc: "20100000002",
        org_name: "GLOBEX SAC",
        phone_secondary: "999333444",
      }),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.displayName).toBe("RICARDO GARCIA PINCHI");
    expect(groups[0]?.aliases).toEqual([
      "RICARDO GARCIA PINCHI",
      "GARCIA PINCHI RICARDO",
    ]);
    expect(groups[0]?.companies).toEqual([
      { ruc: "20100000001", name: "ACME SAC" },
      { ruc: "20100000002", name: "GLOBEX SAC" },
    ]);
    expect(groups[0]?.phones).toEqual(["999111222", "999333444"]);
  });

  it("groups companies by ruc and aggregates associated people and phones", () => {
    const groups = groupCompaniesByRuc([
      row({
        dni: "12345678",
        name: "RICARDO GARCIA PINCHI",
        org_ruc: "20100000001",
        org_name: "ACME SAC",
        phone_primary: "999111222",
      }),
      row({
        dni: "87654321",
        name: "MARIA LOPEZ",
        org_ruc: "20100000001",
        org_name: "ACME SAC",
        phone_secondary: "999333444",
      }),
      row({
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
      row({
        dni: "11111111",
        name: "A",
        org_ruc: null,
        org_name: null,
        phone_primary: "999111111",
      }),
      row({
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
});
