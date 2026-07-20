import { expect, test } from "./fixtures";

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

    await expect(
      asBackOffice.getByText("No hay clientes").first(),
    ).toBeVisible();

    await expect(
      asBackOffice.getByRole("button", { name: "Añadir un cliente" }),
    ).toHaveCount(0);
  });
});
