import type { ReactNode, CSSProperties, ElementType } from "react";

// Parallax has been removed in favour of scroll-triggered reveal animations.
// This file now renders its children with no scroll-driven motion.
// (Kept for backwards compatibility with existing imports.)
interface Props {
  children: ReactNode;
  as?: ElementType;
  speed?: number;
  speedX?: number;
  rotate?: number;
  scale?: number;
  className?: string;
  style?: CSSProperties;
}

export default function Parallax({
  children,
  as: Tag = "div",
  className = "",
  style,
}: Props) {
  return (
    <Tag className={className} style={style}>
      {children}
    </Tag>
  );
}
