import { makeDocumentResult } from "@tests/support/shared/search-row";
import { describe, expect, it } from "vitest";

import { groupByDocument } from "~/features/search/model/grouping";

describe("client search grouping people", () => {
  it("groups documents by type+number and keeps first name as displayName", () => {
    const groups = groupByDocument([
      makeDocumentResult({
        doc_number: "12345678",
        name: "RICARDO GARCIA PINCHI",
        org_ruc: "20100000001",
        org_name: "ACME SAC",
        phone_primary: "999111222",
      }),
      makeDocumentResult({
        doc_number: "12345678",
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

  it("collects sibling phones alongside primary and secondary", () => {
    const groups = groupByDocument([
      makeDocumentResult({
        doc_number: "12345678",
        phone_primary: "999000001",
        sibling_phones: ["999000002", "999000003"],
      }),
    ]);

    expect(groups[0]?.phones).toEqual(["999000001", "999000002", "999000003"]);
  });

  it("deduplicates repeated phones across fields", () => {
    const groups = groupByDocument([
      makeDocumentResult({
        doc_number: "12345678",
        phone_primary: "999000001",
      }),
      makeDocumentResult({
        doc_number: "12345678",
        phone_secondary: "999000001",
      }),
    ]);

    expect(groups[0]?.phones).toEqual(["999000001"]);
  });
});
