import type { ElementType, ReactNode } from "react";
import { useScrollReveal } from "../hooks/useScrollReveal";

interface Props {
  children: string | ReactNode;
  as?: ElementType;
  className?: string;
  stagger?: number;
  delay?: number;
}

/**
 * Splits text into words and animates each one in sequence on scroll.
 * Words rise from below, un-blur, and fade in.
 */
export default function RevealText({
  children,
  as: Tag = "h2",
  className = "",
  stagger = 70,
  delay = 0,
}: Props) {
  const [ref, visible] = useScrollReveal<HTMLElement>({ threshold: 0.15 });

  if (typeof children !== "string") {
    return (
      <Tag
        ref={ref as unknown as React.Ref<HTMLElement>}
        className={`sr-words ${visible ? "is-visible" : ""} ${className}`}
      >
        {children}
      </Tag>
    );
  }

  const words = children.split(/(\s+)/);
  let idx = 0;

  return (
    <Tag
      ref={ref as unknown as React.Ref<HTMLElement>}
      className={`sr-words ${visible ? "is-visible" : ""} ${className}`}
    >
      {words.map((w, i) => {
        if (/^\s+$/.test(w)) return <span key={i}>{w}</span>;
        const wordDelay = delay + idx * stagger;
        idx++;
        return (
          <span
            key={i}
            className="word"
            style={{ transitionDelay: `${wordDelay}ms` }}
          >
            {w}
          </span>
        );
      })}
    </Tag>
  );
}
