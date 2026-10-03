import { useScrollReveal } from "../hooks/useScrollReveal";

// Replaced parallax-while-scrolling with a clean reveal-on-scroll animation.
// The image fades in, scales down from 1.12 → 1, and un-blurs as it enters view.
interface Props {
  src: string;
  alt: string;
  className?: string;
  speed?: number; // kept for API compatibility
  zoom?: number; // kept for API compatibility
  loading?: "lazy" | "eager";
}

export default function ParallaxImage({
  src,
  alt,
  className = "",
  loading = "lazy",
}: Props) {
  const [ref, visible] = useScrollReveal<HTMLDivElement>({ threshold: 0.1 });

  return (
    <div
      ref={ref}
      className={`sr-image ${visible ? "is-visible" : ""} overflow-hidden ${className}`}
    >
      <img
        src={src}
        alt={alt}
        loading={loading}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
