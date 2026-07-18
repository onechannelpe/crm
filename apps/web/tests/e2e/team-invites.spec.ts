import { expect, test } from "./fixtures";

// A full, real invite journey across two identities: an admin provisions a
// teammate through the real form, copies the invite link the form surfaces, and
// the invitee activates their account from that link and lands authenticated.
// The link is a durable, shareable artifact (its token lives in the URL and is
// stored retrievably), so the flow never depends on email, which is decoupled
// and best-effort. Nothing here is mocked but the outbound email network call.
test.describe("team invites", () => {
  test("an admin invites a teammate who activates and signs in", async ({
    asAdmin,
    browser,
    workerServer,
  }) => {
    const email = `newhire.${Date.now()}@e2e.local`;
    const password = "NewHirePass123!";

    await asAdmin.goto("/settings/members?tab=invite");
    // Scope to the invite form; the members page renders another role select
    // elsewhere that would otherwise collide.
    const form = asAdmin.locator("form").filter({
      has: asAdmin.getByRole("button", { name: "Enviar invitación" }),
    });
    await form.getByLabel("Nombres").fill("Nueva");
    await form.getByLabel("Primer apellido").fill("Contratacion");
    await form.getByLabel("Segundo apellido").fill("E2E");
    await form.getByLabel("Correo corporativo").fill(email);
    await form.getByLabel("Rol", { exact: true }).selectOption("back_office");
    await form.getByRole("button", { name: "Enviar invitación" }).click();

    // The form surfaces the freshly minted link. Reading it out of the UI is
    // exactly how an admin hands the invite over when email does not land.
    const linkText = asAdmin.getByText(/https?:\/\/\S+\/login\/invite\/\S+/);
    await expect(linkText).toBeVisible();
    const inviteUrl = (await linkText.textContent())?.trim();
    if (!inviteUrl) throw new Error("invite link was not surfaced");

    // The invitee activates in a fresh, unauthenticated context.
    const context = await browser.newContext({ baseURL: workerServer.baseURL });
    const invitee = await context.newPage();
    await invitee.goto(inviteUrl);

    await expect(
      invitee.getByRole("button", { name: "Activar cuenta" }),
    ).toBeVisible();
    await expect(invitee.locator(`input[value="${email}"]`)).toBeVisible();
    await invitee
      .getByPlaceholder("Contraseña", { exact: true })
      .fill(password);
    await invitee.getByPlaceholder("Confirmar contraseña").fill(password);
    await invitee.getByRole("button", { name: "Activar cuenta" }).click();

    // Activation logs them in and redirects off the invite page.
    await expect(invitee).not.toHaveURL(/\/login\/invite/);
    await context.close();
  });
});
