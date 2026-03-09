import { A } from "@solidjs/router";

import { AnimatedPlaceholder } from "~/components/layout/animated-placeholder";
import { Button } from "~/components/ui/input/button";

import styles from "./[...404].module.css";

export default function NotFound() {
  return (
    <div class={styles.backdrop}>
      <div class={styles.container}>
        <AnimatedPlaceholder type="error404" />
        <div class={styles.textContainer}>
          <p class={styles.title}>Fuera del camino</p>
          <p class={styles.subtitle}>
            La página que buscas no existe o fue movida. Volvamos al inicio.
          </p>
        </div>
        <div class={styles.buttonWrap}>
          <A href="/" style={{ "text-decoration": "none", display: "block" }}>
            <Button variant="primary" style={{ width: "100%" }}>
              Volver al inicio
            </Button>
          </A>
        </div>
      </div>
    </div>
  );
}
