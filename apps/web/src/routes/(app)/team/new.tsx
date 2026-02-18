import { useNavigate } from "@solidjs/router";
import { createResource, createSignal, For } from "solid-js";

import { createTeamInvite, getBranchTeamsForInvite } from "~/actions/team";
import { useToast } from "~/components/feedback/toast-provider";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
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
    <div class="max-w-2xl mx-auto space-y-6">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold text-gray-900">Invitar usuario</h1>
        <Button variant="secondary" onClick={() => navigate("/team")}>
          Cancelar
        </Button>
      </div>

      <Card>
        <form
          class="p-6 space-y-4"
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
          <div class="space-y-2">
            <label class="space-y-2 block">
              <span class="text-sm font-medium">Rol</span>
              <select
                value={role()}
                onInput={(event) => setRole(event.currentTarget.value)}
                class="flex h-11 w-full rounded-2xl border border-input/85 bg-white/75 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 transition-colors"
              >
                <For each={ROLE_OPTIONS}>
                  {(option) => (
                    <option value={option.value}>{option.label}</option>
                  )}
                </For>
              </select>
            </label>
          </div>
          <div class="space-y-2">
            <label class="space-y-2 block">
              <span class="text-sm font-medium">Equipo (opcional)</span>
              <select
                value={teamId()}
                onInput={(event) => setTeamId(event.currentTarget.value)}
                class="flex h-11 w-full rounded-2xl border border-input/85 bg-white/75 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 transition-colors"
              >
                <option value="">Sin equipo asignado</option>
                <For each={teams() ?? []}>
                  {(team) => <option value={team.id}>{team.name}</option>}
                </For>
              </select>
            </label>
          </div>
          <Button type="submit" disabled={saving()}>
            {saving() ? "Enviando..." : "Enviar invitacion"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
