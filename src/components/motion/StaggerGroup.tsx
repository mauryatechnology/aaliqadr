"use client";

import { Children, isValidElement, type ReactNode } from "react";
import { Reveal } from "./Reveal";

export function StaggerGroup({
  children,
  staggerMs = 80,
  baseDelay = 0,
  y = 24,
  className,
}: {
  children: ReactNode;
  staggerMs?: number;
  baseDelay?: number;
  y?: number;
  className?: string;
}) {
  const items = Children.toArray(children);
  return (
    <div className={className}>
      {items.map((child, index) => {
        const delay = baseDelay + (index * staggerMs) / 1000;
        return (
          <Reveal key={isValidElement(child) && child.key ? child.key : index} delay={delay} y={y}>
            {child}
          </Reveal>
        );
      })}
    </div>
  );
}
