import { describe, expect, it } from "vitest";

import {
  asSummaryTable,
  calculateRates,
} from "../../src/features/rate-simulator/model/calculator";

describe("rate simulator calculator", () => {
  it("matches the validated spreadsheet sample", () => {
    const result = calculateRates({
      mix: {
        debito: "40",
        credito: "59",
        foranea: "1",
      },
      currentRates: {
        debito: "3.2",
        credito: "3.2",
        foranea: "4.09",
      },
      proposalRates: {
        debito: "2.7",
        credito: "2.7",
        foranea: "3.99",
      },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const summary = asSummaryTable(result.value);

    expect(summary).toEqual({
      COMPETENCIA: {
        "ANTES DE IGV": "3.21%",
        "DESPUES DE IGV": "3.79%",
      },
      CULQI: {
        "ANTES DE IGV": "2.71%",
        "DESPUES DE IGV": "2.91%",
      },
    });
  });

  it("fails when mix does not sum 100%", () => {
    const result = calculateRates({
      mix: {
        debito: "50",
        credito: "20",
        foranea: "20",
      },
      currentRates: {
        debito: "3.2",
        credito: "3.2",
        foranea: "4.09",
      },
      proposalRates: {
        debito: "2.7",
        credito: "2.7",
        foranea: "3.99",
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error).toContain("La mezcla debe sumar 100%");
  });

  it("fails for invalid numeric inputs", () => {
    const result = calculateRates({
      mix: {
        debito: "40",
        credito: "59",
        foranea: "1",
      },
      currentRates: {
        debito: "3.2",
        credito: "x",
        foranea: "4.09",
      },
      proposalRates: {
        debito: "2.7",
        credito: "2.7",
        foranea: "3.99",
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error).toContain("currentRates.credito");
  });
});
