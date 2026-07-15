import styles from "./onboarding-page.module.css";

interface OnboardingSkipButtonProps {
  label: string;
  disabled?: boolean;
  onClick: () => void;
}

export function OnboardingSkipButton(props: OnboardingSkipButtonProps) {
  return (
    <button
      type="button"
      class={styles.skipButton}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      {props.label}
    </button>
  );
}
