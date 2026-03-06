import { splitProps, type JSX } from "solid-js";

import { Button, type ButtonProps } from "~/components/ui/input/button";

type AuthProviderButtonProps = Omit<ButtonProps, "children" | "type"> & {
  label: string;
  icon?: JSX.Element;
};

export function AuthProviderButton(props: AuthProviderButtonProps) {
  const [local, others] = splitProps(props, ["label", "icon"]);

  return (
    <Button type="button" variant="outline" {...others}>
      {local.icon}
      <span>{local.label}</span>
    </Button>
  );
}
