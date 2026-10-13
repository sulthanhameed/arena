import { useEffect, useRef, useState, type RefObject } from "react";

interface Options {
  /** 0 – 1. Percentage of element that must be visible. Default 0.05 */
  threshold?: number;
  /** Run only once. Default true */
  once?: boolean;
  /** Negative top margin to trigger earlier */
  rootMargin?: string;
}

/**
 * Detects when an element scrolls into view and toggles a boolean.
 * NOTE: kept for any internal compatibility — most components now
 * use useScrollProgress for continuous scroll-driven effects.
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options: Options = {},
): [RefObject<T | null>, boolean] {
  const { threshold = 0.05, once = true, rootMargin = "0px 0px 5% 0px" } =
    options;
  const ref = useRef<T>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      setVisible(true);
      return;
    }

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold, rootMargin },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once, rootMargin]);

  return [ref, visible];
}

/**
 * Continuous scroll progress 0 → 1 as the element moves through the viewport.
 * 0 = element just entered bottom of viewport
 * 0.5 = element is centred
 * 1 = element just left the top
 *
 * This is the core hook for live scroll-driven parallax effects.
 */
export function useScrollProgress<T extends HTMLElement = HTMLDivElement>(): [
  RefObject<T | null>,
  number,
] {
  const ref = useRef<T>(null);
  const [progress, setProgress] = useState(0.5);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) {
      setProgress(0.5);
      return;
    }

    let raf = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when element top is at bottom of viewport; 1 when element bottom is at top
      const p = (vh - rect.top) / (vh + rect.height);
      setProgress(Math.max(0, Math.min(1, p)));
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return [ref, progress];
}
