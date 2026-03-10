"use client";

import * as React from "react";

type AspectRatioProps = React.HTMLAttributes<HTMLDivElement> & {
  ratio?: number;
};

export function AspectRatio({
  ratio = 16 / 9,
  children,
  className,
  ...props
}: AspectRatioProps) {
  const paddingTop = `${100 / ratio}%`;

  return (
    <div className={className} {...props}>
      <div style={{ position: "relative", width: "100%", paddingTop }}>
        <div style={{ position: "absolute", inset: 0 }}>{children}</div>
      </div>
    </div>
  );
}

export default AspectRatio;
