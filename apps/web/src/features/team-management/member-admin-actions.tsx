import { useAction, useNavigate } from "@solidjs/router";
import { createSignal, Show } from "solid-js";

import { useSnackBar } from "~/components/feedback/snack-bar-manager/use-snack-bar";
import { SettingsSection } from "~/components/settings/SettingsSection";
import { ConfirmDialog } from "~/components/ui/confirm-dialog";
import { Button } from "~/components/ui/input/button";
import type { MemberDetail } from "~/contracts/members";
import {
  deactivateMemberMutation,
  deleteMemberMutation,
  reactivateMemberMutation,
  startImpersonationMutation,
} from "~/features/team-management/data/member-mutations";
import { actionErrorMessage } from "~/lib/wire-error";

import styles from "./team-management.module.css";

type PendingDialog = "deactivate" | "delete" | "impersonate" | null;

export function MemberAdminActions(props: { detail: MemberDetail }) {
  const navigate = useNavigate();
  const deactivate = useAction(deactivateMemberMutation);
  const reactivate = useAction(reactivateMemberMutation);
  const remove = useAction(deleteMemberMutation);
  const impersonate = useAction(startImpersonationMutation);
  const { enqueueSuccessSnackBar, enqueueErrorSnackBar } = useSnackBar();

  const [dialog, setDialog] = createSignal<PendingDialog>(null);
  const [busy, setBusy] = createSignal(false);

  const showSection = () =>
    props.detail.canManage ||
    props.detail.canDelete ||
    props.detail.canImpersonate;

  async function runReactivate() {
    setBusy(true);
    try {
      const { message } = await reactivate(props.detail.id);
      enqueueSuccessSnackBar(message);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDeactivate() {
    setBusy(true);
    try {
      const { message } = await deactivate(props.detail.id);
      enqueueSuccessSnackBar(message);
      setDialog(null);
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    setBusy(true);
    try {
      const { message } = await remove(props.detail.id);
      enqueueSuccessSnackBar(message);
      setDialog(null);
      navigate("/settings/members");
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
    } finally {
      setBusy(false);
    }
  }

  async function confirmImpersonate() {
    setBusy(true);
    try {
      await impersonate(props.detail.id);
      // Session provider still holds the previous identity; reload to re-resolve.
      window.location.assign("/");
    } catch (caught: unknown) {
      enqueueErrorSnackBar(actionErrorMessage(caught));
      setBusy(false);
    }
  }

  return (
    <Show when={showSection()}>
      <ConfirmDialog
        isOpen={dialog() === "deactivate"}
        title="Desactivar usuario"
        description="El usuario perderá acceso de inmediato. Podrás reactivarlo más tarde."
        confirmLabel="Desactivar"
        variant="destructive"
        loading={busy()}
        onConfirm={() => void confirmDeactivate()}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        isOpen={dialog() === "delete"}
        title="Eliminar cuenta"
        description="Esta acción es permanente. Solo es posible si el usuario no tiene clientes activos asignados."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={busy()}
        onConfirm={() => void confirmDelete()}
        onClose={() => setDialog(null)}
      />
      <ConfirmDialog
        isOpen={dialog() === "impersonate"}
        title="Suplantar usuario"
        description="Navegarás la aplicación como este usuario hasta que salgas de la suplantación."
        confirmLabel="Suplantar"
        loading={busy()}
        onConfirm={() => void confirmImpersonate()}
        onClose={() => setDialog(null)}
      />

      <SettingsSection
        title="Administración"
        description="Realiza acciones administrativas o elimina esta cuenta de forma permanente."
      >
        <div class={styles.adminActions}>
          <Show when={props.detail.canImpersonate && props.detail.isActive}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy()}
              onClick={() => setDialog("impersonate")}
            >
              Suplantar
            </Button>
          </Show>

          <Show when={props.detail.canManage}>
            <Show
              when={props.detail.isActive}
              fallback={
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  loading={busy()}
                  onClick={() => void runReactivate()}
                >
                  Reactivar
                </Button>
              }
            >
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={busy()}
                onClick={() => setDialog("deactivate")}
              >
                Desactivar
              </Button>
            </Show>
          </Show>

          <Show when={props.detail.canDelete}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              class={styles.dangerAction}
              disabled={busy()}
              onClick={() => setDialog("delete")}
            >
              Eliminar cuenta
            </Button>
          </Show>
        </div>
      </SettingsSection>
    </Show>
  );
}
