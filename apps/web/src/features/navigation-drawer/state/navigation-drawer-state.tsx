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

import { isSettingsRoutePath } from "~/lib/navigation/route-classification";

const DRAWER_EXPANDED_STORAGE_KEY = "crm-navigation-drawer-expanded";
const DRAWER_WIDTH_STORAGE_KEY = "crm-navigation-drawer-width";
const ADVANCED_MODE_STORAGE_KEY = "crm-navigation-drawer-advanced-mode";

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
  hasMemorizedNavigation: () => boolean;
  setHasMemorizedNavigation: (
    value: boolean | ((current: boolean) => boolean),
  ) => void;
  memorizeNavigationState: (path: string, drawerExpanded: boolean) => void;
  isSectionOpen: (id: string) => boolean;
  setSectionOpen: (id: string, open: boolean) => void;
  toggleSectionOpen: (id: string) => void;
  isFolderOpen: (id: string) => boolean;
  toggleFolderOpen: (id: string) => void;
}

const NavigationDrawerStateContext =
  createContext<NavigationDrawerStateValue>();

function clampWidth(value: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(value)));
}

function isSettingsLikePath(path: string) {
  return isSettingsRoutePath(path);
}

export function NavigationDrawerStateProvider(props: ParentProps) {
  const initialViewportWidth = 1280;
  const initialExpanded = true;
  const initialWidth = DEFAULT_WIDTH;
  const initialAdvancedMode = false;

  const [expanded, setExpandedSignal] = createSignal(initialExpanded);
  const [width, setWidthSignal] = createSignal(initialWidth);
  const [viewportWidth, setViewportWidth] = createSignal(initialViewportWidth);
  const [currentMobileDrawer, setCurrentMobileDrawer] =
    createSignal<MobileDrawerType>("main");
  const [advancedModeEnabled, setAdvancedModeEnabledSignal] =
    createSignal(initialAdvancedMode);
  const [memorizedExpanded, setMemorizedExpanded] = createSignal(true);
  const [memorizedPath, setMemorizedPath] = createSignal("/");
  const [hasMemorizedNavigation, setHasMemorizedNavigation] =
    createSignal(false);
  const [openSections, setOpenSections] = createSignal<Record<string, boolean>>(
    {},
  );
  const [openFolders, setOpenFolders] = createSignal<Record<string, boolean>>(
    {},
  );
  const [hasPersistableInteraction, setHasPersistableInteraction] =
    createSignal(false);

  const setExpanded: NavigationDrawerStateValue["setExpanded"] = (value) => {
    const previous = expanded();
    const next =
      typeof value === "function"
        ? (value as (current: boolean) => boolean)(previous)
        : value;

    if (previous !== next) {
      setHasPersistableInteraction(true);
    }

    setExpandedSignal(next);
  };

  const setAdvancedModeEnabled: NavigationDrawerStateValue["setAdvancedModeEnabled"] =
    (value) => {
      const previous = advancedModeEnabled();
      const next =
        typeof value === "function"
          ? (value as (current: boolean) => boolean)(previous)
          : value;
      if (previous !== next) {
        setHasPersistableInteraction(true);
      }
      setAdvancedModeEnabledSignal(next);
    };

  const isMobile = createMemo(() => viewportWidth() <= MOBILE_BREAKPOINT);

  onMount(() => {
    if (typeof window === "undefined") {
      return;
    }

    setViewportWidth(window.innerWidth);

    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    onCleanup(() => window.removeEventListener("resize", handleResize));
  });

  createEffect(() => {
    if (typeof window === "undefined" || !hasPersistableInteraction()) {
      return;
    }

    window.localStorage.setItem(
      DRAWER_EXPANDED_STORAGE_KEY,
      String(expanded()),
    );
  });

  createEffect(() => {
    if (typeof window === "undefined" || !hasPersistableInteraction()) {
      return;
    }

    window.localStorage.setItem(
      DRAWER_WIDTH_STORAGE_KEY,
      String(clampWidth(width())),
    );
  });

  createEffect(() => {
    if (typeof window === "undefined" || !hasPersistableInteraction()) {
      return;
    }

    window.localStorage.setItem(
      ADVANCED_MODE_STORAGE_KEY,
      String(advancedModeEnabled()),
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
    setOpenSections((current) => ({
      ...current,
      [id]: !(current[id] ?? true),
    }));
  };

  const isFolderOpen = (id: string) => {
    const state = openFolders();
    const value = state[id];

    return value ?? true;
  };

  const toggleFolderOpen = (id: string) => {
    setOpenFolders((current) => ({
      ...current,
      [id]: !(current[id] ?? true),
    }));
  };

  const memorizeNavigationState = (path: string, drawerExpanded: boolean) => {
    if (isSettingsLikePath(path)) {
      return;
    }

    setMemorizedExpanded(drawerExpanded);
    setMemorizedPath(path);
    setHasMemorizedNavigation(true);
  };

  return (
    <NavigationDrawerStateContext.Provider
      value={{
        expanded,
        setExpanded,
        width,
        setWidth: (next) => {
          const nextClamped = clampWidth(next);
          if (width() !== nextClamped) {
            setHasPersistableInteraction(true);
          }
          setWidthSignal(nextClamped);
        },
        isMobile,
        currentMobileDrawer,
        setCurrentMobileDrawer,
        advancedModeEnabled,
        setAdvancedModeEnabled,
        memorizedExpanded,
        setMemorizedExpanded,
        memorizedPath,
        setMemorizedPath,
        hasMemorizedNavigation,
        setHasMemorizedNavigation,
        memorizeNavigationState,
        isSectionOpen,
        setSectionOpen,
        toggleSectionOpen,
        isFolderOpen,
        toggleFolderOpen,
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
