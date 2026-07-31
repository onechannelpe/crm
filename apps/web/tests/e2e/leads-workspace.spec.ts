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

  test("registers a lead without a header error", async ({ asExecutive }) => {
    const pageErrors: string[] = [];
    asExecutive.on("pageerror", (error) => pageErrors.push(error.message));

    await asExecutive.goto("/records");
    await asExecutive
      .getByRole("button", { name: "Añadir un cliente" })
      .click();
    await asExecutive.getByRole("textbox", { name: "RUC" }).fill("20987654321");
    await asExecutive
      .getByRole("textbox", { name: "Proveedor actual" })
      .fill("Proveedor de prueba");
    await asExecutive
      .getByRole("spinbutton", { name: "Tasa débito actual" })
      .fill("1.5");
    await asExecutive
      .getByRole("spinbutton", { name: "Tasa crédito actual" })
      .fill("2.5");
    await asExecutive.getByRole("spinbutton", { name: "GPV" }).fill("1000");
    await asExecutive.getByRole("spinbutton", { name: "Ticket" }).fill("100");
    await asExecutive
      .getByRole("textbox", { name: "Giro de negocio" })
      .fill("Comercio");
    await asExecutive
      .getByRole("combobox", { name: "Banco de abono" })
      .selectOption("BCP");
    await asExecutive
      .getByRole("spinbutton", { name: "Cantidad de POS" })
      .fill("1");

    await asExecutive.getByRole("button", { name: "Crear cliente" }).click();

    await expect(
      asExecutive.getByText("RUC 20987654321").first(),
    ).toBeVisible();
    expect(pageErrors).toEqual([]);
  });
});
