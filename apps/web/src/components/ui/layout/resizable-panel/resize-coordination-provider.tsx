import {
  createContext,
  createSignal,
  type Accessor,
  type ParentProps,
  useContext,
} from "solid-js";

type ResizeCoordinationContextValue = {
  resizeIsActive: Accessor<boolean>;
  setResizeIsActive: (value: boolean) => void;
};

const ResizeCoordinationContext =
  createContext<ResizeCoordinationContextValue>();

export function ResizeCoordinationProvider(props: ParentProps) {
  const [resizeIsActive, setResizeIsActive] = createSignal(true);

  return (
    <ResizeCoordinationContext.Provider
      value={{ resizeIsActive, setResizeIsActive }}
    >
      {props.children}
    </ResizeCoordinationContext.Provider>
  );
}

export function useResizeCoordination() {
  const context = useContext(ResizeCoordinationContext);

  if (!context) {
    throw new Error(
      "useResizeCoordination must be used within ResizeCoordinationProvider",
    );
  }

  return context;
}
