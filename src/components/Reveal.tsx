import type { ReactNode, ElementType, CSSProperties } from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";

type Variant = "fade" | "up" | "down" | "left" | "right" | "zoom" | "blur";

interface Props {
  children: ReactNode;
  as?: ElementType;
  variant?: Variant;
  delay?: number;
  duration?: number;
  className?: string;
  threshold?: number;
  style?: CSSProperties;
}

/**
 * Triggers a CSS-driven reveal animation when the element scrolls into view.
 * Uses .sr utility classes from index.css.
 */
export default function Reveal({
  children,
  as: Tag = "div",
  variant = "up",
  delay = 0,
  duration,
  className = "",
  threshold = 0.1,
  style,
}: Props) {
  const [ref, visible] = useScrollReveal<HTMLDivElement>({ threshold });

  const variantClass = `sr-${variant}`;
  const computedStyle: CSSProperties = {
    transitionDelay: `${delay}ms`,
    ...(duration ? { transitionDuration: `${duration}ms` } : {}),
    ...style,
  };

  return (
    <Tag
      ref={ref as unknown as React.Ref<HTMLElement>}
      className={`sr ${variantClass} ${visible ? "is-visible" : ""} ${className}`}
      style={computedStyle}
    >
      {children}
    </Tag>
  );
}

export function Stagger({
  children,
  className = "",
}: {
  children: ReactNode[];
  variant?: Variant;
  step?: number;
  initialDelay?: number;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
