import { expect, test } from "./fixtures";

// Role-scoped behavior on the real leads workspace, exercised across two roles
// in one test. Only the executive role holds `lead:register`, so the register
// affordance is present for them and absent for the back office, while both can
// open the workspace. This stays hermetic: registering a lead itself drives the
// company-search engine, which the e2e topology deliberately does not run, so
// that belongs in an engine-backed suite (see docs/e2e-testing.md).
test.describe("leads workspace", () => {
  test("an executive can register leads; the back office cannot", async ({
    asExecutive,
    asBackOffice,
  }) => {
    await asExecutive.goto("/records");
    await expect(
      asExecutive.getByText("No hay clientes").first(),
    ).toBeVisible();
    await expect(
      asExecutive.getByRole("button", { name: "Añadir un cliente" }),
    ).toBeVisible();

    await asBackOffice.goto("/records");
    // The same workspace loads for the back office.
    await expect(
      asBackOffice.getByText("No hay clientes").first(),
    ).toBeVisible();
    // The register affordance is gated on lead:register, which they lack.
    await expect(
      asBackOffice.getByRole("button", { name: "Añadir un cliente" }),
    ).toHaveCount(0);
  });
});
