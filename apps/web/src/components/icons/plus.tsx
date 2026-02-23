import { IconBase, type IconProps } from "./icon-base";

export default function Plus(props: Omit<IconProps, "iconNode">) {
  return (
    <IconBase
      name="plus"
      iconNode={[
        ["path", { d: "M5 12h14" }],
        ["path", { d: "M12 5v14" }],
      ]}
      {...props}
    />
  );
}
