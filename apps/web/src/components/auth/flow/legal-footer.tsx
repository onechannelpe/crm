import linkStyles from "./auth-links.module.css";

export function LegalFooter() {
  return (
    <span>
      <a href="/legal/privacy" class={linkStyles.helpLink}>
        Privacidad
      </a>
      {" · "}
      <a href="/legal/terms" class={linkStyles.helpLink}>
        Términos
      </a>
    </span>
  );
}
