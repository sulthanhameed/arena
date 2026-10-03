import type { ElementType, ReactNode } from "react";

// Backwards-compat — no longer reveals word-by-word, just renders the text.
// Use <Parallax> instead for live scroll-driven text motion.
interface Props {
  children: string | ReactNode;
  as?: ElementType;
  className?: string;
  stagger?: number;
  delay?: number;
  underline?: boolean;
}

export default function ScrollText({
  children,
  as: Tag = "h2",
  className = "",
}: Props) {
  return <Tag className={className}>{children}</Tag>;
}
