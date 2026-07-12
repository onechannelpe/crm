import { useAction, useSubmission } from "@solidjs/router";
import { For, Show, createEffect, createSignal, on } from "solid-js";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { DatePicker } from "~/components/ui/date-picker/date-picker-field";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import type { InviteManagement } from "~/contracts/team";
import { createTeamInviteMutation } from "~/lib/mutations/team";
import { parseWireError } from "~/lib/wire-error";
import { codeIs } from "~/lib/wire-error-codes";

import {
  getInviteExpiryFieldError,
  getMinInviteExpiryDate,
  INVITE_EXPIRY_ERROR_TEXT,
  INVITE_EXPIRY_HELPER_TEXT,
  parseInviteExpiryDate,
} from "./team-invite-expiry";

import styles from "./settings-members.module.css";

export function InviteForm(props: { setup: InviteManagement }) {
  const createInvite = useAction(createTeamInviteMutation);
  const submission = useSubmission(createTeamInviteMutation);
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const [names, setNames] = createSignal("");
  const [firstSurname, setFirstSurname] = createSignal("");
  const [secondSurname, setSecondSurname] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [role, setRole] = createSignal("");
  const [executiveCategory, setExecutiveCategory] = createSignal("");
  const [teamId, setTeamId] = createSignal("");
  const [expiresAt, setExpiresAt] = createSignal("");
  const [expiresAtErrorMessage, setExpiresAtErrorMessage] = createSignal<
    string | undefined
  >();

  // Keep the selected role valid as the actor's assignable roles change.
  createEffect(
    on(
      () => props.setup,
      (setup) => {
        const roleStillAssignable = setup.assignableRoles.some(
          (option) => option.value === role(),
        );

        if (!roleStillAssignable) {
          setRole(getDefaultAssignableRole(setup));
        }
      },
    ),
  );

  function resetForm() {
    setNames("");
    setFirstSurname("");
    setSecondSurname("");
    setEmail("");
    setRole(getDefaultAssignableRole(props.setup));
    setExecutiveCategory("");
    setTeamId("");
    setExpiresAt("");
    setExpiresAtErrorMessage(undefined);
  }

  async function handleSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const parsedExpiresAt = parseInviteExpiryDate(expiresAt());

    if (parsedExpiresAt.isErr) {
      setExpiresAtErrorMessage(parsedExpiresAt.error);
      return;
    }

    try {
      const { message } = await createInvite({
        names: names(),
        firstSurname: firstSurname(),
        secondSurname: secondSurname(),
        email: email(),
        role: role(),
        executiveCategory: executiveCategory() || null,
        teamId: teamId() || null,
        expiresAt: parsedExpiresAt.value,
      });

      resetForm();
      enqueueSuccessSnackBar(message);
    } catch (caught: unknown) {
      const wire = parseWireError(caught);

      if (
        codeIs(wire, "invalid_expires_at") ||
        codeIs(wire, "expires_at_too_soon")
      ) {
        setExpiresAtErrorMessage(INVITE_EXPIRY_ERROR_TEXT);
        return;
      }

      enqueueErrorSnackBar(wire.message);
    }
  }

  return (
    <form
      class={styles.inviteForm}
      onSubmit={(event) => void handleSubmit(event)}
    >
      <Input
        label="Nombres"
        value={names()}
        onInput={(event) => setNames(event.currentTarget.value)}
        required
      />

      <Input
        label="Primer apellido"
        value={firstSurname()}
        onInput={(event) => setFirstSurname(event.currentTarget.value)}
        required
      />

      <Input
        label="Segundo apellido"
        value={secondSurname()}
        onInput={(event) => setSecondSurname(event.currentTarget.value)}
        required
      />

      <Input
        type="email"
        label="Correo corporativo"
        value={email()}
        onInput={(event) => setEmail(event.currentTarget.value)}
        required
      />

      <Select
        label="Rol"
        value={role()}
        onInput={(event) => {
          setRole(event.currentTarget.value);
          setExecutiveCategory("");
        }}
      >
        <For each={props.setup.assignableRoles}>
          {(option) => <option value={option.value}>{option.label}</option>}
        </For>
      </Select>

      <Show when={role() === "executive"}>
        <Select
          label="Categoría"
          value={executiveCategory()}
          onInput={(event) => setExecutiveCategory(event.currentTarget.value)}
          required
        >
          <option value="">Seleccionar categoría...</option>
          <option value="elite">Elite</option>
          <option value="corporativa">Corporativa</option>
        </Select>
      </Show>

      <Select
        label="Equipo (opcional)"
        value={teamId()}
        onInput={(event) => setTeamId(event.currentTarget.value)}
      >
        <option value="">Sin equipo</option>
        <For each={props.setup.teams}>
          {(team) => <option value={team.id}>{team.name}</option>}
        </For>
      </Select>

      <DatePicker
        label="Fecha de vencimiento (opcional)"
        value={expiresAt()}
        min={getMinInviteExpiryDate()}
        description={INVITE_EXPIRY_HELPER_TEXT}
        error={expiresAtErrorMessage()}
        onInput={(nextValue) => {
          setExpiresAt(nextValue);
          setExpiresAtErrorMessage(getInviteExpiryFieldError(nextValue));
        }}
      />

      <div class={styles.inviteActions}>
        <Button
          type="submit"
          loading={submission.pending}
          disabled={
            submission.pending ||
            !role() ||
            (role() === "executive" && !executiveCategory()) ||
            expiresAtErrorMessage() !== undefined
          }
        >
          Enviar invitación
        </Button>
      </div>
    </form>
  );
}

function getDefaultAssignableRole(setup: InviteManagement): string {
  return setup.assignableRoles[0]?.value ?? "";
}
