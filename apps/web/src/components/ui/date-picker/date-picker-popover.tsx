import {
  Show,
  createEffect,
  createSignal,
  onCleanup,
  type Accessor,
} from "solid-js";
import { Portal } from "solid-js/web";

import { DatePickerCalendar } from "./date-picker-calendar";
import type { VisibleMonth } from "./date-picker-model";

import styles from "./date-picker.module.css";

interface DatePickerPopoverProps {
  isOpen: Accessor<boolean>;
  anchor: Accessor<HTMLElement | undefined>;
  selectedDate: Date | null;
  minDate: Date | null;
  visibleMonth: VisibleMonth;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
  focusedIso: string;
  onFocusedIsoChange: (iso: string) => void;
  onFocusMoveByDays: (dayDelta: number) => void;
  onFocusMonthBoundary: (kind: "start" | "end") => void;
  onSelect: (iso: string) => void;
  onPopoverMount: (element: HTMLDivElement | undefined) => void;
}

export function DatePickerPopover(props: DatePickerPopoverProps) {
  const [position, setPosition] = createSignal({ top: 0, left: 0 });
  let popoverRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (!props.isOpen()) return;

    const updatePosition = () => {
      const anchor = props.anchor();
      if (!anchor || typeof window === "undefined") return;

      const rect = anchor.getBoundingClientRect();
      const popoverHeight = popoverRef?.offsetHeight ?? 320;
      const left = Math.min(rect.left, window.innerWidth - 280 - 8);
      const fitsBelow =
        rect.bottom + 8 + popoverHeight <= window.innerHeight - 8;
      const top = fitsBelow
        ? rect.bottom + 8
        : Math.max(8, rect.top - popoverHeight - 8);

      setPosition({
        top,
        left: Math.max(8, left),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    onCleanup(() => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    });
  });

  return (
    <Show when={props.isOpen()}>
      <Portal>
        <div
          class={styles.popover}
          role="dialog"
          aria-modal="false"
          style={{
            top: `${position().top}px`,
            left: `${position().left}px`,
          }}
          ref={(element) => {
            popoverRef = element;
            props.onPopoverMount(element);
          }}
        >
          <DatePickerCalendar
            visibleMonth={props.visibleMonth}
            selectedDate={props.selectedDate}
            minDate={props.minDate}
            onMonthChange={props.onMonthChange}
            onYearChange={props.onYearChange}
            onPreviousMonth={props.onPreviousMonth}
            onNextMonth={props.onNextMonth}
            focusedIso={props.focusedIso}
            onFocusedIsoChange={props.onFocusedIsoChange}
            onFocusMoveByDays={props.onFocusMoveByDays}
            onFocusMonthBoundary={props.onFocusMonthBoundary}
            onSelect={props.onSelect}
          />
        </div>
      </Portal>
    </Show>
  );
}
