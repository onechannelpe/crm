import { ResponsiveImage } from "@crm/images";
import { type JSX } from "solid-js";

import logo from "~/assets/images/logo/logo.webp?responsive";

import styles from "./auth-flow-shell.module.css";

interface AuthFlowShellProps {
  title: string;
  description?: string;
  topBar?: JSX.Element;
  footer?: JSX.Element;
  children: JSX.Element;
}

export function AuthFlowShell(props: AuthFlowShellProps) {
  return (
    <div class={styles.shell}>
      <section class={styles.surface}>
        <div class={styles.content}>
          {props.topBar !== undefined ? (
            <div class={styles.topBar}>{props.topBar}</div>
          ) : null}
          <div class={styles.logo}>
            <ResponsiveImage
              sources={logo}
              alt="CRM"
              width="40"
              height="40"
              class={styles.logoImage}
            />
          </div>
          <h1 class={styles.title}>{props.title}</h1>
          {props.description ? (
            <p class={styles.description}>{props.description}</p>
          ) : null}

          <div class={styles.body}>{props.children}</div>

          {props.footer !== undefined ? (
            <footer class={styles.footer}>{props.footer}</footer>
          ) : null}
        </div>
      </section>
    </div>
  );
}
