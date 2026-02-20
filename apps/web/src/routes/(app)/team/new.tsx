import { useNavigate } from "@solidjs/router";
import { createResource, createSignal, For } from "solid-js";

import { createTeamInvite, getBranchTeamsForInvite } from "~/actions/team";
import { useToast } from "~/components/feedback/toast-provider";
import {
  AppPage,
  AppPageHeader,
  AppPageSection,
} from "~/components/layout/page";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Select } from "~/components/ui/select";
import { getErrorMessage } from "~/lib/errors";

const ROLE_OPTIONS = [
  { value: "executive", label: "Ejecutivo" },
  { value: "supervisor", label: "Supervisor" },
  { value: "back_office", label: "Validacion" },
  { value: "sales_manager", label: "Gerente de ventas" },
  { value: "logistics", label: "Logistica" },
  { value: "hr", label: "RRHH" },
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
      showToast("success", "Invitacion creada y enviada");
      navigate("/team");
    } catch (err: unknown) {
      showToast(
        "error",
        getErrorMessage(err, "No se pudo crear la invitacion"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage class="mx-auto max-w-2xl">
      <AppPageHeader
        eyebrow="Equipo"
        title="Invitar usuario"
        description="Genera una invitación con rol y equipo opcional."
        actions={
          <Button variant="secondary" onClick={() => navigate("/team")}>
            Cancelar
          </Button>
        }
      />

      <AppPageSection class="p-6">
        <form
          class="space-y-4"
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
            label="Correo laboral"
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
            <option value="">Sin equipo asignado</option>
            <For each={teams() ?? []}>
              {(team) => <option value={team.id}>{team.name}</option>}
            </For>
          </Select>
          <Button type="submit" disabled={saving()}>
            {saving() ? "Enviando..." : "Enviar invitacion"}
          </Button>
        </form>
      </AppPageSection>
    </AppPage>
  );
}
