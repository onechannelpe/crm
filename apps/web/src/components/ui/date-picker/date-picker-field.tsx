import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  onCleanup,
} from "solid-js";

import CalendarDays from "~/components/icons/calendar-days";
import { useHotkey } from "~/lib/hotkey/use-hotkey";
import { cn } from "~/lib/utils";

import {
  addDays,
  clampVisibleMonth,
  endOfMonth,
  formatIsoDate,
  getVisibleMonth,
  parseIsoDate,
  shiftVisibleMonth,
  startOfMonth,
  todayLocalDate,
  withVisibleMonthMonth,
  withVisibleMonthYear,
  type VisibleMonth,
} from "./date-picker-model";
import { DatePickerPopover } from "./date-picker-popover";

import styles from "./date-picker.module.css";

export interface DatePickerProps {
  label?: string;
  description?: string;
  error?: string;
  value: string;
  min?: string;
  required?: boolean;
  id?: string;
  name?: string;
  disabled?: boolean;
  placeholder?: string;
  onInput: (value: string) => void;
}

export function DatePicker(props: DatePickerProps) {
  const inputId = props.id || createUniqueId();
  const messageId = `${inputId}-message`;
  const [isOpen, setIsOpen] = createSignal(false);
  const selectedDate = createMemo(() => parseIsoDate(props.value));
  const minDate = createMemo(() => parseIsoDate(props.min ?? ""));
  const preferredVisibleMonth = () =>
    getVisibleMonth(selectedDate() ?? minDate() ?? todayLocalDate());
  const [visibleMonth, setVisibleMonth] = createSignal<VisibleMonth>(
    preferredVisibleMonth(),
  );
  const [focusedIso, setFocusedIso] = createSignal(
    formatIsoDate(selectedDate() ?? minDate() ?? todayLocalDate()),
  );
  let fieldRef: HTMLDivElement | undefined;
  let controlRef: HTMLDivElement | undefined;
  let popoverRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (!isOpen()) {
      setVisibleMonth(preferredVisibleMonth());
      setFocusedIso(
        formatIsoDate(selectedDate() ?? minDate() ?? todayLocalDate()),
      );
    }
  });

  createEffect(() => {
    if (typeof document === "undefined") return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!isOpen()) return;
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (fieldRef?.contains(target)) return;
      if (popoverRef?.contains(target)) return;
      setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    onCleanup(() => {
      document.removeEventListener("pointerdown", handlePointerDown);
    });
  });

  useHotkey("Escape", () => setIsOpen(false), {
    enabled: isOpen,
    allowInInputs: true,
  });

  const describedBy = () => {
    if (!props.description && !props.error) return undefined;
    return messageId;
  };

  const updateVisibleMonth = (
    updater: (current: VisibleMonth) => VisibleMonth,
  ) => {
    setVisibleMonth((current) =>
      clampVisibleMonth(updater(current), minDate()),
    );
  };

  const updateFocusedDate = (nextDate: Date) => {
    const min = minDate();
    const clampedDate =
      min && nextDate.getTime() < min.getTime() ? min : nextDate;
    setFocusedIso(formatIsoDate(clampedDate));
    setVisibleMonth(getVisibleMonth(clampedDate));
  };

  return (
    <div
      class={styles.field}
      ref={(element) => {
        fieldRef = element;
      }}
    >
      {props.label && (
        <label for={inputId} class={styles.label}>
          {props.label}
          {props.required && (
            <span aria-hidden="true" class={styles.required}>
              *
            </span>
          )}
        </label>
      )}
      <div
        class={cn(
          styles.controlShell,
          props.error ? styles.errorShell : undefined,
          isOpen() ? styles.openShell : undefined,
        )}
        ref={(element) => {
          controlRef = element;
        }}
      >
        <input
          id={inputId}
          name={props.name}
          class={styles.control}
          type="text"
          inputMode="numeric"
          autocomplete="off"
          spellcheck={false}
          placeholder={props.placeholder ?? "AAAA-MM-DD"}
          value={props.value}
          aria-describedby={describedBy()}
          aria-invalid={props.error ? "true" : undefined}
          disabled={props.disabled}
          onFocus={() => setIsOpen(true)}
          onInput={(event) => {
            props.onInput(event.currentTarget.value);
            setIsOpen(true);
          }}
        />
        <button
          type="button"
          class={styles.iconButton}
          aria-label="Abrir calendario"
          aria-haspopup="dialog"
          aria-expanded={isOpen()}
          disabled={props.disabled}
          onClick={() => setIsOpen((current) => !current)}
        >
          <CalendarDays size={16} />
        </button>
      </div>
      {(props.error || props.description) && (
        <p
          id={messageId}
          class={props.error ? styles.errorText : styles.descriptionText}
        >
          {props.error ?? props.description}
        </p>
      )}
      <DatePickerPopover
        isOpen={isOpen}
        anchor={() => controlRef ?? fieldRef}
        selectedDate={selectedDate()}
        minDate={minDate()}
        visibleMonth={visibleMonth()}
        onMonthChange={(month) =>
          updateVisibleMonth((current) => withVisibleMonthMonth(current, month))
        }
        onYearChange={(year) =>
          updateVisibleMonth((current) => withVisibleMonthYear(current, year))
        }
        onPreviousMonth={() =>
          updateVisibleMonth((current) => shiftVisibleMonth(current, -1))
        }
        onNextMonth={() =>
          updateVisibleMonth((current) => shiftVisibleMonth(current, 1))
        }
        focusedIso={focusedIso()}
        onFocusedIsoChange={setFocusedIso}
        onFocusMoveByDays={(dayDelta) => {
          const current =
            parseIsoDate(focusedIso()) ??
            selectedDate() ??
            minDate() ??
            todayLocalDate();
          updateFocusedDate(addDays(current, dayDelta));
        }}
        onFocusMonthBoundary={(kind) => {
          const boundary =
            kind === "start"
              ? startOfMonth(visibleMonth())
              : endOfMonth(visibleMonth());
          updateFocusedDate(boundary);
        }}
        onSelect={(iso) => {
          props.onInput(iso);
          setIsOpen(false);
        }}
        onPopoverMount={(element) => {
          popoverRef = element;
        }}
      />
    </div>
  );
}
