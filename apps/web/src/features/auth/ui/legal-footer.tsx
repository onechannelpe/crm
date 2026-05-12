import linkStyles from "./auth-links.module.css";

export function LegalFooter() {
  return (
    <span>
      Al continuar, aceptas nuestra{" "}
      <a href="/legal/privacy" class={linkStyles.helpLink}>
        Política de privacidad
      </a>
      {" y "}
      <a href="/legal/terms" class={linkStyles.helpLink}>
        Términos del servicio
      </a>
      .
    </span>
  );
}
