import { createAsync, useAction, useNavigate } from "@solidjs/router";
import { createMemo, createSignal, onMount } from "solid-js";

import ChevronDown from "~/components/icons/chevron-down";
import ChevronUp from "~/components/icons/chevron-up";
import Heart from "~/components/icons/heart";
import Mail from "~/components/icons/mail";
import { TopBarActionButton } from "~/components/layout/top-bar-action-button";
import { TopBarCommandButton } from "~/components/layout/top-bar-command-button";
import { TopBarTooltip } from "~/components/layout/top-bar-tooltip";
import { PAGE_HEADER_SIDE_PANEL_BUTTON_CLICK_OUTSIDE_ID } from "~/features/side-panel/constants/side-panel-click-outside-id";
import { SIDE_PANEL_HOTKEY } from "~/features/side-panel/constants/side-panel-hotkey";
import { useSidePanel } from "~/features/side-panel/state/use-side-panel";
import { createRootSidePanelPage } from "~/features/side-panel/types/side-panel-page";
import {
  addLeadToFavoritesMutation,
  removeLeadFromFavoritesMutation,
} from "~/features/workflow/data/command-mutations";
import {
  leadDetailQuery,
  leadListQuery,
} from "~/features/workflow/data/queries";
import { revalidateWorkflowLead } from "~/features/workflow/data/revalidate-workflow";
import { useHotkey } from "~/lib/hotkey/use-hotkey";

import styles from "./record-show-header.module.css";

type RecordShowHeaderActionsProps = {
  leadId: string;
};

const LEAD_NAVIGATION_LIMIT = 200;

export function RecordShowHeaderActions(props: RecordShowHeaderActionsProps) {
  const navigate = useNavigate();
  const detail = createAsync(() => leadDetailQuery(props.leadId));
  const leadList = createAsync(() =>
    leadListQuery({ limit: LEAD_NAVIGATION_LIMIT, offset: 0 }),
  );
  const addFavorite = useAction(addLeadToFavoritesMutation);
  const removeFavorite = useAction(removeLeadFromFavoritesMutation);

  const currentIndex = createMemo(() => {
    const rows = leadList()?.rows;
    if (!rows) {
      return -1;
    }

    return rows.findIndex((row) => row.id === props.leadId);
  });

  const previousLeadId = createMemo(() => {
    const rows = leadList()?.rows;
    const index = currentIndex();
    if (!rows || index <= 0) {
      return null;
    }

    return rows[index - 1]?.id ?? null;
  });

  const nextLeadId = createMemo(() => {
    const rows = leadList()?.rows;
    const index = currentIndex();
    if (!rows || index < 0 || index >= rows.length - 1) {
      return null;
    }

    return rows[index + 1]?.id ?? null;
  });

  const [modKey, setModKey] = createSignal("Ctrl");
  const [favoriteBusy, setFavoriteBusy] = createSignal(false);
  const { isOpen, openPanel, closePanel } = useSidePanel();

  const isFavorite = () => detail()?.lead.isFavorite ?? false;

  onMount(() => {
    if (/Mac/i.test(navigator.platform)) {
      setModKey("⌘");
    }
  });

  const toggleSidePanel = () => {
    if (isOpen()) {
      closePanel();
      return;
    }

    openPanel(createRootSidePanelPage());
  };

  useHotkey(SIDE_PANEL_HOTKEY, toggleSidePanel);

  const goToLead = (leadId: string | null) => {
    if (!leadId) {
      return;
    }

    navigate(`/records/${leadId}`);
  };

  const toggleFavorite = async () => {
    if (favoriteBusy()) {
      return;
    }

    setFavoriteBusy(true);
    try {
      if (isFavorite()) {
        await removeFavorite({ leadId: props.leadId });
        await revalidateWorkflowLead(props.leadId);
        return;
      }

      await addFavorite({ leadId: props.leadId });
      await revalidateWorkflowLead(props.leadId);
    } finally {
      setFavoriteBusy(false);
    }
  };

  return (
    <>
      <TopBarTooltip content="Registro siguiente">
        <TopBarActionButton
          ariaLabel="Navegar al siguiente registro"
          iconOnly
          disabled={!nextLeadId()}
          onClick={() => goToLead(nextLeadId())}
        >
          <ChevronDown size={16} />
        </TopBarActionButton>
      </TopBarTooltip>

      <TopBarTooltip content="Registro anterior">
        <TopBarActionButton
          ariaLabel="Navegar al registro anterior"
          iconOnly
          disabled={!previousLeadId()}
          onClick={() => goToLead(previousLeadId())}
        >
          <ChevronUp size={16} />
        </TopBarActionButton>
      </TopBarTooltip>

      <TopBarTooltip
        content={isFavorite() ? "Quitar de favoritos" : "Agregar a favoritos"}
      >
        <TopBarActionButton
          ariaLabel={
            isFavorite() ? "Quitar de favoritos" : "Agregar a favoritos"
          }
          iconOnly
          disabled={favoriteBusy()}
          pressed={isFavorite()}
          onClick={() => void toggleFavorite()}
          class={styles.desktopAction}
        >
          <Heart size={16} color={isFavorite() ? "var(--accent)" : undefined} />
        </TopBarActionButton>
      </TopBarTooltip>

      <TopBarTooltip content="Enviar email estará disponible pronto">
        <TopBarActionButton
          ariaLabel="Enviar email"
          label="Enviar email"
          disabled
          class={styles.desktopAction}
        >
          <Mail size={14} />
        </TopBarActionButton>
      </TopBarTooltip>

      <TopBarCommandButton
        isOpen={isOpen()}
        modKey={modKey()}
        onClick={toggleSidePanel}
        dataClickOutsideId={PAGE_HEADER_SIDE_PANEL_BUTTON_CLICK_OUTSIDE_ID}
      />
    </>
  );
}
