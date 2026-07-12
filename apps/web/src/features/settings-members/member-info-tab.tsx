import { useAction } from "@solidjs/router";
import { createEffect, createSignal, For, on, onCleanup, Show } from "solid-js";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { DatePicker } from "~/components/ui/date-picker/date-picker-field";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import type { MemberDetail } from "~/contracts/members";
import {
  updateMemberExpiryMutation,
  updateMemberProfileMutation,
} from "~/lib/mutations/members";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "./settings-members.module.css";

const PROFILE_SAVE_DELAY_MS = 400;

function toDateInputValue(epochMs: number | null): string {
  if (epochMs === null) return "";
  const date = new Date(epochMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function MemberInfoTab(props: { detail: MemberDetail }) {
  const updateProfile = useAction(updateMemberProfileMutation);
  const updateExpiry = useAction(updateMemberExpiryMutation);
  const { enqueueErrorSnackBar } = useSnackBar();

  const [names, setNames] = createSignal(props.detail.names);
  const [firstSurname, setFirstSurname] = createSignal(
    props.detail.firstSurname,
  );
  const [secondSurname, setSecondSurname] = createSignal(
    props.detail.secondSurname,
  );
  const [teamId, setTeamId] = createSignal(props.detail.teamId ?? "");
  const [category, setCategory] = createSignal(
    props.detail.executiveCategory ?? "",
  );
  const [expiresAt, setExpiresAt] = createSignal(
    toDateInputValue(props.detail.expiresAt),
  );

  // Re-seed the fields when the underlying record changes (after a save
  // revalidates the detail query).
  createEffect(
    on(
      () => props.detail,
      (detail) => {
        setNames(detail.names);
        setFirstSurname(detail.firstSurname);
        setSecondSurname(detail.secondSurname);
        setTeamId(detail.teamId ?? "");
        setCategory(detail.executiveCategory ?? "");
        setExpiresAt(toDateInputValue(detail.expiresAt));
      },
      { defer: true },
    ),
  );

  const disabled = () => !props.detail.canManage;

  let profileTimer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(profileTimer));

  async function saveProfile() {
    if (!names().trim() || !firstSurname().trim() || !secondSurname().trim()) {
      return;
    }
    try {
      await updateProfile({
        userId: props.detail.id,
        names: names(),
        firstSurname: firstSurname(),
        secondSurname: secondSurname(),
        teamId: teamId() || null,
        executiveCategory: category() || null,
      });
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  function scheduleProfileSave() {
    clearTimeout(profileTimer);
    profileTimer = setTimeout(() => void saveProfile(), PROFILE_SAVE_DELAY_MS);
  }

  // Discrete selects commit immediately rather than waiting on the debounce.
  function saveProfileNow() {
    clearTimeout(profileTimer);
    void saveProfile();
  }

  async function saveExpiry(value: string) {
    try {
      await updateExpiry({
        userId: props.detail.id,
        expiresAt: value ? new Date(`${value}T23:59:59`).getTime() : null,
      });
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    }
  }

  return (
    <>
      <SettingsSection
        title="Datos del usuario"
        description="Nombre, equipo y categoría del miembro."
      >
        <div class={styles.formGrid}>
          <Input
            label="Nombres"
            value={names()}
            onInput={(event) => {
              setNames(event.currentTarget.value);
              scheduleProfileSave();
            }}
            disabled={disabled()}
            required
          />
          <Input
            label="Primer apellido"
            value={firstSurname()}
            onInput={(event) => {
              setFirstSurname(event.currentTarget.value);
              scheduleProfileSave();
            }}
            disabled={disabled()}
            required
          />
          <Input
            label="Segundo apellido"
            value={secondSurname()}
            onInput={(event) => {
              setSecondSurname(event.currentTarget.value);
              scheduleProfileSave();
            }}
            disabled={disabled()}
            required
          />
          <Select
            label="Equipo"
            value={teamId()}
            onInput={(event) => {
              setTeamId(event.currentTarget.value);
              saveProfileNow();
            }}
            disabled={disabled()}
          >
            <option value="">Sin equipo</option>
            <For each={props.detail.teams}>
              {(team) => <option value={team.id}>{team.name}</option>}
            </For>
          </Select>
          <Show when={props.detail.role === "executive"}>
            <Select
              label="Categoría"
              value={category()}
              onInput={(event) => {
                setCategory(event.currentTarget.value);
                saveProfileNow();
              }}
              disabled={disabled()}
              required
            >
              <option value="">Seleccionar categoría...</option>
              <option value="elite">Elite</option>
              <option value="corporativa">Corporativa</option>
            </Select>
          </Show>
        </div>
      </SettingsSection>

      <SettingsSection title="Correo electrónico">
        <Input value={props.detail.email} disabled />
      </SettingsSection>

      <SettingsSection
        title="Vencimiento de la cuenta"
        description="Si defines una fecha, la cuenta se desactiva automáticamente al llegar."
      >
        <DatePicker
          label="Fecha de vencimiento"
          value={expiresAt()}
          disabled={disabled()}
          onInput={(value) => {
            setExpiresAt(value);
            void saveExpiry(value);
          }}
        />
      </SettingsSection>
    </>
  );
}
