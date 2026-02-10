import { type JSX, splitProps } from "solid-js";

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children: JSX.Element;
}

export function Card(props: CardProps) {
  const [local, others] = splitProps(props, ["children", "class"]);
  return (
    <div
      class={`bg-white rounded-xl border border-gray-200 shadow-sm ${local.class || ""}`}
      {...others}
    >
      {local.children}
    </div>
  );
}

export function CardHeader(props: CardProps) {
  const [local, others] = splitProps(props, ["children", "class"]);
  return (
    <div
      class={`px-6 py-4 border-b border-gray-100 flex items-center justify-between ${local.class || ""}`}
      {...others}
    >
      {local.children}
    </div>
  );
}

export function CardTitle(props: CardProps) {
  const [local, others] = splitProps(props, ["children", "class"]);
  return (
    <h3
      class={`text-base font-semibold text-gray-900 ${local.class || ""}`}
      {...others}
    >
      {local.children}
    </h3>
  );
}

export function CardContent(props: CardProps) {
  const [local, others] = splitProps(props, ["children", "class"]);
  return (
    <div class={`p-6 ${local.class || ""}`} {...others}>
      {local.children}
    </div>
  );
}
