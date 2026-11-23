import type { ReactNode } from "react";

export function AspectRatio({
  ratio,
  children,
}: {
  ratio: number;
  children: ReactNode;
}) {
  return <div style={{ aspectRatio: ratio }}>{children}</div>;
}
