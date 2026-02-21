import { useNavigate } from "@solidjs/router";
import { createResource, createSignal, For } from "solid-js";

import { createTeamInvite, getBranchTeamsForInvite } from "~/actions/team";
import { useToast } from "~/components/feedback/toast-provider";
import {
  AppPage,
  AppPageHeader,
} from "~/components/layout/page";
import { Button } from "~/components/ui/input/button";
import { Input } from "~/components/ui/input/input";
import { Select } from "~/components/ui/input/select";
import { getErrorMessage } from "~/lib/errors";

const ROLE_OPTIONS = [
  { value: "executive", label: "Executive" },
  { value: "supervisor", label: "Supervisor" },
  { value: "back_office", label: "Back office" },
  { value: "sales_manager", label: "Sales manager" },
  { value: "logistics", label: "Logistics" },
  { value: "hr", label: "HR" },
  { value: "admin", label: "Admin" },
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
      showToast("success", "Invite sent");
      navigate("/team");
    } catch (err: unknown) {
      showToast("error", getErrorMessage(err, "Failed to create invite"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage class="mx-auto max-w-2xl">
      <AppPageHeader
        eyebrow="People"
        title="Invite member"
        description="Create an invite with role and optional team assignment."
        actions={
          <Button variant="secondary" onClick={() => navigate("/team")}>
            Cancel
          </Button>
        }
      />

      <section class="tw-record-index-panel p-4">
        <form
          class="space-y-4"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          <Input
            label="Full name"
            value={fullName()}
            onInput={(event) => setFullName(event.currentTarget.value)}
            required
          />
          <Input
            type="email"
            label="Work email"
            value={email()}
            onInput={(event) => setEmail(event.currentTarget.value)}
            required
          />
          <Select
            label="Role"
            value={role()}
            onInput={(event) => setRole(event.currentTarget.value)}
          >
            <For each={ROLE_OPTIONS}>
              {(option) => <option value={option.value}>{option.label}</option>}
            </For>
          </Select>

          <Select
            label="Team (optional)"
            value={teamId()}
            onInput={(event) => setTeamId(event.currentTarget.value)}
          >
            <option value="">No team</option>
            <For each={teams() ?? []}>
              {(team) => <option value={team.id}>{team.name}</option>}
            </For>
          </Select>
          <Button type="submit" disabled={saving()}>
            {saving() ? "Sending..." : "Send invite"}
          </Button>
        </form>
      </section>
    </AppPage>
  );
}
