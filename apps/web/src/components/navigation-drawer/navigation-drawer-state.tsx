import {
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type ParentProps,
  useContext,
} from "solid-js";

const SIDEBAR_EXPANDED_STORAGE_KEY = "crm-sidebar-expanded";
const SIDEBAR_WIDTH_STORAGE_KEY = "crm-sidebar-width";
const MOBILE_BREAKPOINT = 768;

interface NavigationDrawerStateValue {
  expanded: () => boolean;
  setExpanded: (value: boolean | ((current: boolean) => boolean)) => void;
  width: () => number;
  setWidth: (value: number) => void;
  isMobile: () => boolean;
  currentMobileDrawer: () => "main" | "settings";
  setCurrentMobileDrawer: (
    value:
      | "main"
      | "settings"
      | ((current: "main" | "settings") => "main" | "settings"),
  ) => void;
}

const NavigationDrawerStateContext = createContext<NavigationDrawerStateValue>();

export function NavigationDrawerStateProvider(props: ParentProps) {
  const [expanded, setExpanded] = createSignal(true);
  const [width, setWidth] = createSignal(220);
  const [viewportWidth, setViewportWidth] = createSignal<number>(1280);
  const [currentMobileDrawer, setCurrentMobileDrawer] = createSignal<
    "main" | "settings"
  >("main");

  const isMobile = createMemo(() => viewportWidth() < MOBILE_BREAKPOINT);

  onMount(() => {
    if (typeof window === "undefined") return;

    setViewportWidth(window.innerWidth);

    const storedExpanded = window.localStorage.getItem(
      SIDEBAR_EXPANDED_STORAGE_KEY,
    );

    if (storedExpanded === "false") {
      setExpanded(false);
    }

    const storedWidth = Number(
      window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY),
    );

    if (Number.isFinite(storedWidth) && storedWidth >= 180 && storedWidth <= 320) {
      setWidth(Math.round(storedWidth));
    }

    const handleResize = () => setViewportWidth(window.innerWidth);

    window.addEventListener("resize", handleResize);

    onCleanup(() => window.removeEventListener("resize", handleResize));
  });

  createEffect(() => {
    if (typeof document === "undefined") return;

    if (isMobile()) {
      document.documentElement.style.setProperty(
        "--nav-drawer-current-width",
        "0px",
      );
      return;
    }

    document.documentElement.style.setProperty(
      "--nav-drawer-current-width",
      expanded() ? `${width()}px` : "40px",
    );
  });

  createEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      SIDEBAR_EXPANDED_STORAGE_KEY,
      String(expanded()),
    );
  });

  createEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(width()));
  });

  return (
    <NavigationDrawerStateContext.Provider
      value={{
        expanded,
        setExpanded,
        width,
        setWidth,
        isMobile,
        currentMobileDrawer,
        setCurrentMobileDrawer,
      }}
    >
      {props.children}
    </NavigationDrawerStateContext.Provider>
  );
}

export function useNavigationDrawerState() {
  const context = useContext(NavigationDrawerStateContext);

  if (!context) {
    throw new Error(
      "useNavigationDrawerState must be used within NavigationDrawerStateProvider",
    );
  }

  return context;
}
