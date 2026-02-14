import type { JSX } from "solid-js";
import { IconBase, type IconNode, type IconProps } from "./icon-base";

export function createIcon(name: string, iconNode: IconNode) {
    return function Icon(props: Omit<IconProps, "name" | "iconNode">): JSX.Element {
        return <IconBase {...props} name={name} iconNode={iconNode} />;
    };
}
