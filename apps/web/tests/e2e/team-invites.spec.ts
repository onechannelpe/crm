import { expect, test } from "./fixtures";

// A full, real invite journey across two identities: an admin provisions a
// teammate through the real form, the invite email is recorded by the log
// transport (never sent), and the invitee activates their account from the
// emailed link and lands authenticated. Nothing here is mocked but the outbound
// email network call.
test.describe("team invites", () => {
  test("an admin invites a teammate who activates and signs in", async ({
    asAdmin,
    mailbox,
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

    // The invite email is recorded, not sent; its URL carries the raw token the
    // database only stores hashed, so reading it out of the email text is the
    // invitee's only way in.
    let inviteUrl: string | null = null;
    await expect
      .poll(() => {
        const message = mailbox().find((mail) => mail.to === email);
        const match = message?.text.match(/https?:\/\/\S+\/login\/invite\/\S+/);
        inviteUrl = match ? match[0] : null;
        return inviteUrl;
      })
      .not.toBeNull();
    if (!inviteUrl) throw new Error("invite URL was not recorded");

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
