import { onCleanup, onMount } from "solid-js";

export function getUserInitials(fullName: string): string {
    const [first = "", second = ""] = fullName.trim().split(/\s+/);
    return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase() || "ME";
}

export function useMenuDismiss(
    isOpen: () => boolean,
    close: () => void,
    getContainer: () => HTMLDivElement | undefined
) {
    const closeOnOutsideClick = (event: PointerEvent) => {
        const target = event.target;
        const container = getContainer();
        if (!isOpen() || !container || !(target instanceof Node)) return;
        if (!container.contains(target)) close();
    };

    const closeOnEscape = (event: KeyboardEvent) => {
        if (event.key === "Escape") close();
    };

    onMount(() => {
        document.addEventListener("pointerdown", closeOnOutsideClick);
        document.addEventListener("keydown", closeOnEscape);
    });

    onCleanup(() => {
        document.removeEventListener("pointerdown", closeOnOutsideClick);
        document.removeEventListener("keydown", closeOnEscape);
    });
}
