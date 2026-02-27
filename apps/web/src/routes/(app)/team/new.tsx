import { useNavigate } from "@solidjs/router";
import { createResource, createSignal, For } from "solid-js";

import { createTeamInvite, getBranchTeamsForInvite } from "~/actions/team";
import { useToast } from "~/components/feedback/toast-provider";
import { AppPage } from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import { getErrorMessage } from "~/lib/errors";

import styles from "./new-team-page.module.css";

const ROLE_OPTIONS = [
  { value: "executive", label: "Ejecutivo" },
  { value: "supervisor", label: "Supervisor" },
  { value: "back_office", label: "Back office" },
  { value: "sales_manager", label: "Gerente de Ventas" },
  { value: "logistics", label: "Logística" },
  { value: "hr", label: "Recursos Humanos" },
  { value: "admin", label: "Administrador" },
] as const;

export default function NewTeamInvitePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [teams] = createResource(getBranchTeamsForInvite);
  const [fullName, setFullName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [role, setRole] = createSignal("executive");
  const [teamId, setTeamId] = createSignal("");
  const [saving, setSaving] = createSignal(false);

  async function handleSubmit(event: Event): Promise<void> {
    event.preventDefault();
    setSaving(true);
    try {
      await createTeamInvite({
        fullName: fullName(),
        email: email(),
        role: role(),
        teamId: teamId() ? Number(teamId()) : null,
      });
      showToast("success", "Invitación enviada");
      navigate("/team");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to create invite"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage width="medium">
      <div>
        <form
          class={styles.form}
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <Input
            label="Nombre completo"
            value={fullName()}
            onInput={(event) => setFullName(event.currentTarget.value)}
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
            onInput={(event) => setRole(event.currentTarget.value)}
          >
            <For each={ROLE_OPTIONS}>
              {(option) => <option value={option.value}>{option.label}</option>}
            </For>
          </Select>

          <Select
            label="Equipo (opcional)"
            value={teamId()}
            onInput={(event) => setTeamId(event.currentTarget.value)}
          >
            <option value="">Sin equipo</option>
            <For each={teams() ?? []}>
              {(team) => <option value={team.id}>{team.name}</option>}
            </For>
          </Select>

          <div class={styles.formActions}>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/team")}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving()}>
              {saving() ? "Enviando..." : "Enviar invitación"}
            </Button>
          </div>
        </form>
      </div>
    </AppPage>
  );
}
