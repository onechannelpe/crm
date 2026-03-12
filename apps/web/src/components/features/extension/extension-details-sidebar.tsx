import { createSignal, Show } from "solid-js";
import type { Accessor } from "solid-js";

import { Badge } from "~/components/ui/display/badge";
import { Button } from "~/components/ui/input/button";
import X from "~/components/icons/x";
import {
  badgeVariantForPresence,
  badgeVariantForSyncHealth,
  presenceLabel,
  syncHealthLabel,
} from "~/lib/extension/display";
import type { ExtensionExecutiveState } from "~/lib/extension/runtime";

import styles from "./extension-details-sidebar.module.css";

interface ExtensionDetailsSidebarProps {
  isOpen: Accessor<boolean>;
  onClose: () => void;
  extensionState: Accessor<ExtensionExecutiveState | null>;
  extensionError: Accessor<string | null>;
  onReauth?: () => void;
}

export function ExtensionDetailsSidebar(props: ExtensionDetailsSidebarProps) {
  const needsReauth = () =>
    props.extensionState()?.syncHealth === "reauth_required";

  return (
    <Show when={props.isOpen()}>
      <div class={styles.overlay} onClick={props.onClose} />
      <aside class={styles.sidebar}>
        <div class={styles.header}>
          <h3 class={styles.title}>Compañero de llamada</h3>
          <button
            class={styles.closeButton}
            onClick={props.onClose}
            aria-label="Cerrar"
          >
            <X size={16} />
          </button>
        </div>

        <div class={styles.content}>
          <Show
            when={!props.extensionError()}
            fallback={
              <div class={styles.error}>
                <p>{props.extensionError() ?? "La extensión no está disponible."}</p>
              </div>
            }
          >
            <Show
              when={props.extensionState()}
              fallback={
                <div class={styles.empty}>
                  <p>Conectando con la extensión...</p>
                </div>
              }
            >
              {(state) => (
                <>
                  <div class={styles.section}>
                    <h4 class={styles.sectionTitle}>Estado de conexión</h4>
                    <div class={styles.statusGrid}>
                      <div class={styles.statusItem}>
                        <span class={styles.label}>Presencia</span>
                        <Badge
                          variant={badgeVariantForPresence(
                            state().presenceStatus,
                          )}
                        >
                          {presenceLabel(state().presenceStatus)}
                        </Badge>
                      </div>
                      <div class={styles.statusItem}>
                        <span class={styles.label}>Sincronización</span>
                        <Badge
                          variant={badgeVariantForSyncHealth(
                            state().syncHealth,
                          )}
                        >
                          {syncHealthLabel(state().syncHealth)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Show when={state().assignmentId}>
                    <div class={styles.section}>
                      <h4 class={styles.sectionTitle}>Cliente activo</h4>
                      <div class={styles.assignmentCard}>
                        <p class={styles.assignmentId}>
                          # {state().assignmentId}
                        </p>
                        <Show when={state().phone}>
                          <p class={styles.assignmentPhone}>{state().phone}</p>
                        </Show>
                      </div>
                    </div>
                  </Show>

                  <Show when={needsReauth()}>
                    <div class={styles.section}>
                      <div class={styles.alert}>
                        <p class={styles.alertText}>
                          La extensión necesita reconectarse. Recarga la sesión
                          para continuar.
                        </p>
                        <Button
                          onClick={props.onReauth}
                          size="compact"
                          variant="primary"
                        >
                          Reconectar ahora
                        </Button>
                      </div>
                    </div>
                  </Show>
                </>
              )}
            </Show>
          </Show>
        </div>
      </aside>
    </Show>
  );
}
