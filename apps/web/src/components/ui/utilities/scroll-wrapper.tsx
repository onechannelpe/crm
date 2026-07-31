import { clsx } from "clsx";
import {
  createContext,
  createSignal,
  useContext,
  type Accessor,
  type JSX,
} from "solid-js";

import styles from "./scroll-wrapper.module.css";

const ScrollWrapperContext = createContext<Accessor<HTMLElement | undefined>>();

export function useScrollWrapperElement(): Accessor<HTMLElement | undefined> {
  const ctx = useContext(ScrollWrapperContext);
  return ctx ?? (() => undefined);
}

type ScrollWrapperProps = {
  class?: string;
  children: JSX.Element;
};

export function ScrollWrapper(props: ScrollWrapperProps) {
  const [element, setElement] = createSignal<HTMLElement>();
  return (
    <ScrollWrapperContext.Provider value={element}>
      <div ref={setElement} class={clsx(styles.scroll, props.class)}>
        {props.children}
      </div>
    </ScrollWrapperContext.Provider>
  );
}
