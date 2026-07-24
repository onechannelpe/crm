import ChevronRight from "~/components/icons/chevron-right";

import styles from "./navigation-drawer-section.module.css";

interface NavigationDrawerSectionTitleProps {
  label: string;
  onClick?: () => void;
  isOpen?: boolean;
}

export function NavigationDrawerSectionTitle(
  props: NavigationDrawerSectionTitleProps,
) {
  const content = (
    <span class={styles.sectionTitleLabelContainer}>
      <span class={styles.sectionTitleLabel}>{props.label}</span>
      {props.isOpen !== undefined ? (
        <span class={styles.sectionTitleChevron}>
          <ChevronRight
            size={12}
            style={{
              transform: props.isOpen ? "rotate(90deg)" : "rotate(0deg)",
            }}
          />
        </span>
      ) : null}
    </span>
  );

  return (
    <>
      {props.onClick ? (
        <button
          type="button"
          class={styles.sectionTitle}
          onClick={() => {
            props.onClick?.();
          }}
          aria-expanded={props.isOpen}
        >
          {content}
        </button>
      ) : (
        <div class={styles.sectionTitle}>{content}</div>
      )}
    </>
  );
}
