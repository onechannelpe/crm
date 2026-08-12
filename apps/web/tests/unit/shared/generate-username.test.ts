import { describe, expect, it } from "vitest";

import { generateUsername } from "~/domain/identity/generate-username";

describe("generateUsername", () => {
  it("produces first.firstsurname when no conflict", async () => {
    const result = await generateUsername(
      "Maria",
      "Garcia",
      "Lopez",
      async () => false,
    );
    expect(result).toBe("maria.garcia");
  });

  it("escalates to first.firstsurname.secondsurname on first conflict", async () => {
    const taken = new Set(["maria.garcia"]);
    const result = await generateUsername(
      "Maria",
      "Garcia",
      "Lopez",
      async (u) => taken.has(u),
    );
    expect(result).toBe("maria.garcia.lopez");
  });

  it("escalates to numeric suffix when both surname variants are taken", async () => {
    const taken = new Set(["maria.garcia", "maria.garcia.lopez"]);
    const result = await generateUsername(
      "Maria",
      "Garcia",
      "Lopez",
      async (u) => taken.has(u),
    );
    expect(result).toBe("maria.garcia2");
  });

  it("continues numeric escalation", async () => {
    const taken = new Set([
      "maria.garcia",
      "maria.garcia.lopez",
      "maria.garcia2",
    ]);
    const result = await generateUsername(
      "Maria",
      "Garcia",
      "Lopez",
      async (u) => taken.has(u),
    );
    expect(result).toBe("maria.garcia3");
  });

  it("strips diacritics from names", async () => {
    const result = await generateUsername(
      "Sofía",
      "Núñez",
      "Pérez",
      async () => false,
    );
    expect(result).toBe("sofia.nunez");
  });

  it("strips diacritics and handles multi-word names", async () => {
    const result = await generateUsername(
      "María del Carmen",
      "Ríos",
      "Águila",
      async () => false,
    );
    expect(result).toBe("mariadelcarmen.rios");
  });

  it("normalizes compound surnames with spaces", async () => {
    const result = await generateUsername(
      "Luis",
      "Del Aguila",
      "Torres",
      async () => false,
    );
    expect(result).toBe("luis.delaguila");
  });

  it("lowercases all parts", async () => {
    const result = await generateUsername(
      "CARLOS",
      "MENDOZA",
      "QUISPE",
      async () => false,
    );
    expect(result).toBe("carlos.mendoza");
  });
});
