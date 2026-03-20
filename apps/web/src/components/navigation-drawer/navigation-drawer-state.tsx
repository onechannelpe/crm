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

const DRAWER_EXPANDED_STORAGE_KEY = "crm-navigation-drawer-expanded";
const DRAWER_WIDTH_STORAGE_KEY = "crm-navigation-drawer-width";
const ADVANCED_MODE_STORAGE_KEY = "crm-navigation-drawer-advanced-mode";
const DRAWER_SECTION_STORAGE_KEY = "crm-navigation-drawer-open-sections";

const MOBILE_BREAKPOINT = 768;
const MIN_WIDTH = 180;
const MAX_WIDTH = 350;
const DEFAULT_WIDTH = 220;

type MobileDrawerType = "main" | "settings";

interface NavigationDrawerStateValue {
  expanded: () => boolean;
  setExpanded: (value: boolean | ((current: boolean) => boolean)) => void;
  width: () => number;
  setWidth: (value: number) => void;
  isMobile: () => boolean;
  currentMobileDrawer: () => MobileDrawerType;
  setCurrentMobileDrawer: (
    value: MobileDrawerType | ((current: MobileDrawerType) => MobileDrawerType),
  ) => void;
  advancedModeEnabled: () => boolean;
  setAdvancedModeEnabled: (
    value: boolean | ((current: boolean) => boolean),
  ) => void;
  memorizedExpanded: () => boolean;
  setMemorizedExpanded: (
    value: boolean | ((current: boolean) => boolean),
  ) => void;
  memorizedPath: () => string;
  setMemorizedPath: (value: string | ((current: string) => string)) => void;
  isSectionOpen: (id: string) => boolean;
  setSectionOpen: (id: string, open: boolean) => void;
  toggleSectionOpen: (id: string) => void;
}

const NavigationDrawerStateContext = createContext<NavigationDrawerStateValue>();

function clampWidth(value: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(value)));
}

function parseSectionStorage(raw: string | null): Record<string, boolean> {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const result: Record<string, boolean> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "boolean") {
        result[key] = value;
      }
    }

    return result;
  } catch {
    return {};
  }
}

export function NavigationDrawerStateProvider(props: ParentProps) {
  const [expanded, setExpanded] = createSignal(true);
  const [width, setWidth] = createSignal(DEFAULT_WIDTH);
  const [viewportWidth, setViewportWidth] = createSignal(1280);
  const [currentMobileDrawer, setCurrentMobileDrawer] =
    createSignal<MobileDrawerType>("main");
  const [advancedModeEnabled, setAdvancedModeEnabled] = createSignal(true);
  const [memorizedExpanded, setMemorizedExpanded] = createSignal(true);
  const [memorizedPath, setMemorizedPath] = createSignal("/");
  const [openSections, setOpenSections] = createSignal<Record<string, boolean>>(
    {},
  );

  const isMobile = createMemo(() => viewportWidth() <= MOBILE_BREAKPOINT);

  onMount(() => {
    if (typeof window === "undefined") {
      return;
    }

    setViewportWidth(window.innerWidth);

    const storedExpanded = window.localStorage.getItem(
      DRAWER_EXPANDED_STORAGE_KEY,
    );

    if (storedExpanded === "true") {
      setExpanded(true);
    } else if (storedExpanded === "false") {
      setExpanded(false);
    } else {
      setExpanded(window.innerWidth > MOBILE_BREAKPOINT);
    }

    const parsedWidth = Number(
      window.localStorage.getItem(DRAWER_WIDTH_STORAGE_KEY),
    );

    if (Number.isFinite(parsedWidth)) {
      setWidth(clampWidth(parsedWidth));
    }

    const storedAdvanced = window.localStorage.getItem(ADVANCED_MODE_STORAGE_KEY);

    if (storedAdvanced === "true") {
      setAdvancedModeEnabled(true);
    } else if (storedAdvanced === "false") {
      setAdvancedModeEnabled(false);
    }

    setOpenSections(
      parseSectionStorage(window.localStorage.getItem(DRAWER_SECTION_STORAGE_KEY)),
    );

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    onCleanup(() => window.removeEventListener("resize", handleResize));
  });

  createEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(DRAWER_EXPANDED_STORAGE_KEY, String(expanded()));
  });

  createEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(DRAWER_WIDTH_STORAGE_KEY, String(clampWidth(width())));
  });

  createEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      ADVANCED_MODE_STORAGE_KEY,
      String(advancedModeEnabled()),
    );
  });

  createEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(
      DRAWER_SECTION_STORAGE_KEY,
      JSON.stringify(openSections()),
    );
  });

  createEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const drawerWidth = clampWidth(width());

    document.documentElement.style.setProperty(
      "--nav-drawer-current-width",
      isMobile() ? "0px" : expanded() ? `${drawerWidth}px` : "40px",
    );
  });

  const isSectionOpen = (id: string) => {
    const state = openSections();
    const value = state[id];

    return value ?? true;
  };

  const setSectionOpen = (id: string, open: boolean) => {
    setOpenSections((current) => ({ ...current, [id]: open }));
  };

  const toggleSectionOpen = (id: string) => {
    setOpenSections((current) => ({ ...current, [id]: !(current[id] ?? true) }));
  };

  return (
    <NavigationDrawerStateContext.Provider
      value={{
        expanded,
        setExpanded,
        width,
        setWidth: (next) => setWidth(clampWidth(next)),
        isMobile,
        currentMobileDrawer,
        setCurrentMobileDrawer,
        advancedModeEnabled,
        setAdvancedModeEnabled,
        memorizedExpanded,
        setMemorizedExpanded,
        memorizedPath,
        setMemorizedPath,
        isSectionOpen,
        setSectionOpen,
        toggleSectionOpen,
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
