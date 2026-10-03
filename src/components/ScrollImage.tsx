import { useScrollReveal, useScrollProgress } from "../hooks/useScrollReveal";

interface Props {
  src: string;
  alt: string;
  className?: string;
  /** Vertical-wipe clip-path reveal */
  clip?: boolean;
  /** Slow Ken-Burns zoom while in view */
  kenBurns?: boolean;
  /** Parallax shift (px). Negative = up, positive = down */
  parallax?: number;
  loading?: "lazy" | "eager";
}

/**
 * <ScrollImage> — image with optional clip-reveal + Ken-Burns + parallax.
 */
export default function ScrollImage({
  src,
  alt,
  className = "",
  clip = false,
  kenBurns = false,
  parallax = 0,
  loading = "lazy",
}: Props) {
  const [revealRef, visible] = useScrollReveal<HTMLDivElement>({
    threshold: 0.1,
  });
  const [parallaxRef, progress] = useScrollProgress<HTMLDivElement>();

  // Combine both refs
  const setRef = (el: HTMLDivElement | null) => {
    (revealRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    (parallaxRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
  };

  const parallaxY = parallax ? (progress - 0.5) * parallax : 0;

  const reveal = clip ? "reveal-clip" : "";
  const ken = kenBurns ? "image-ken-burns" : "";
  const stateClass = visible ? "is-visible" : "";

  return (
    <div
      ref={setRef}
      className={`${reveal} ${stateClass} overflow-hidden ${className}`}
      style={
        parallax
          ? { transform: `translateY(${parallaxY}px)`, willChange: "transform" }
          : undefined
      }
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={`h-full w-full object-cover ${ken} ${stateClass}`}
      />
    </div>
  );
}
