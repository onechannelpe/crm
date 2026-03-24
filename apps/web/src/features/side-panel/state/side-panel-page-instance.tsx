import {
  type Accessor,
  type ParentProps,
  createContext,
  useContext,
} from "solid-js";

const SidePanelPageInstanceContext = createContext<Accessor<string>>();

type SidePanelPageInstanceProviderProps = ParentProps<{
  pageId: string;
}>;

export function SidePanelPageInstanceProvider(
  props: SidePanelPageInstanceProviderProps,
) {
  const pageId = () => props.pageId;

  return (
    <SidePanelPageInstanceContext.Provider value={pageId}>
      {props.children}
    </SidePanelPageInstanceContext.Provider>
  );
}

export function useSidePanelPageInstanceId(): Accessor<string> {
  const pageId = useContext(SidePanelPageInstanceContext);

  if (pageId === undefined) {
    throw new Error(
      "useSidePanelPageInstanceId must be used inside the side panel router",
    );
  }

  return pageId;
}
