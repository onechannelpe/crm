import { For, createMemo, createSignal, onCleanup, type JSX } from "solid-js";

import styles from "./otp-slot-input.module.css";

interface OtpSlotInputProps {
  value: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
}

const SLOT_COUNT = 6;

function normalizeOtp(value: string): string {
  return value.replace(/\D/g, "").slice(0, SLOT_COUNT);
}

export function OtpSlotInput(props: OtpSlotInputProps) {
  const [activeIndex, setActiveIndex] = createSignal<number | null>(null);
  let inputs: Array<HTMLInputElement | undefined> = [];

  const digits = createMemo(() => {
    const normalized = normalizeOtp(props.value);
    return Array.from(
      { length: SLOT_COUNT },
      (_, index) => normalized[index] ?? "",
    );
  });

  const focusInput = (index: number) => {
    const next = inputs[index];
    if (!next) return;
    next.focus();
    next.select();
  };

  const updateDigits = (nextDigits: string[]) => {
    props.onValueChange(normalizeOtp(nextDigits.join("")));
  };

  const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (
    event,
  ) => {
    const index = Number(event.currentTarget.dataset.index);
    const incoming = normalizeOtp(event.currentTarget.value);
    const nextDigits = [...digits()];

    if (!incoming) {
      nextDigits[index] = "";
      updateDigits(nextDigits);
      return;
    }

    incoming.split("").forEach((digit, offset) => {
      const target = index + offset;
      if (target < SLOT_COUNT) {
        nextDigits[target] = digit;
      }
    });
    updateDigits(nextDigits);

    const nextIndex = Math.min(index + incoming.length, SLOT_COUNT - 1);
    queueMicrotask(() => focusInput(nextIndex));
  };

  const handleKeyDown: JSX.EventHandler<HTMLInputElement, KeyboardEvent> = (
    event,
  ) => {
    const index = Number(event.currentTarget.dataset.index);
    const nextDigits = [...digits()];

    if (event.key === "Backspace" && !nextDigits[index] && index > 0) {
      nextDigits[index - 1] = "";
      updateDigits(nextDigits);
      event.preventDefault();
      queueMicrotask(() => focusInput(index - 1));
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < SLOT_COUNT - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste: JSX.EventHandler<HTMLInputElement, ClipboardEvent> = (
    event,
  ) => {
    const pasted = normalizeOtp(event.clipboardData?.getData("text") ?? "");
    if (!pasted) return;
    event.preventDefault();
    props.onValueChange(pasted);
    queueMicrotask(() => focusInput(Math.min(pasted.length, SLOT_COUNT - 1)));
  };

  onCleanup(() => {
    inputs = [];
  });

  return (
    <div class={styles.container}>
      <For each={digits()}>
        {(digit, index) => (
          <>
            <div
              classList={{
                [styles.slot]: true,
                [styles.slotActive]: activeIndex() === index(),
              }}
            >
              {digit || <span class={styles.placeholder}>X</span>}
              <input
                ref={(element) => {
                  inputs[index()] = element;
                }}
                type="text"
                inputmode="numeric"
                autocomplete={index() === 0 ? "one-time-code" : undefined}
                aria-label={`Digito ${index() + 1} del codigo de verificacion`}
                maxlength={1}
                class={styles.input}
                data-index={index()}
                value={digit}
                disabled={props.disabled}
                onFocus={() => setActiveIndex(index())}
                onBlur={() => setActiveIndex(null)}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
              />
            </div>
            <span class={styles.dash} hidden={index() !== 2}>
              <span class={styles.dashLine} />
            </span>
          </>
        )}
      </For>
    </div>
  );
}
