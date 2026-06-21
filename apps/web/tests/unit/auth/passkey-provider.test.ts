import { describe, expect, it } from "vitest";

import { resolveWebauthnRelyingParty } from "~/server/auth/factors/passkey-provider";

describe("passkey relying party resolution", () => {
  it("derives the relying party from the public origin", () => {
    const relyingParty = resolveWebauthnRelyingParty(
      "https://5173-firebase-crm-1772279181549.cluster-zhw3w37rxzgkutusbbhib6qhra.cloudworkstations.dev",
    );

    expect(relyingParty).toEqual({
      origin:
        "https://5173-firebase-crm-1772279181549.cluster-zhw3w37rxzgkutusbbhib6qhra.cloudworkstations.dev",
      rpID: "5173-firebase-crm-1772279181549.cluster-zhw3w37rxzgkutusbbhib6qhra.cloudworkstations.dev",
    });
  });

  it("uses the host as rpID and drops the port", () => {
    expect(resolveWebauthnRelyingParty("http://localhost:5173")).toEqual({
      origin: "http://localhost:5173",
      rpID: "localhost",
    });
  });
});
