import { useCallback, useEffect, useState } from "react";

/**
 * ─────────────────────────────────────────────────────────────
 *  Khang entrance intro — "The Opening Ritual"
 * ─────────────────────────────────────────────────────────────
 *
 *  An ink curtain drops over the site, then:
 *
 *   0.10s  an enso (Zen brush ring) draws itself clockwise
 *   0.42s  康 is painted on top-to-bottom, a brush tip trailing down it
 *   1.25s  a jade seal stamp slams into the corner + knocks out a shockwave
 *   1.48s  K·H·A·N·G rise letter by letter out of a blur
 *   1.95s  the subtitle hairlines grow outwards
 *   2.15s  a sheen sweeps across the wordmark
 *   2.60s  the curtains part vertically and the site scales into place
 *
 *  Skippable with click, Enter, Space or Escape, and completely
 *  bypassed for `prefers-reduced-motion`.
 */

export type IntroPhase = "playing" | "exiting" | "done";

interface Props {
  /** Lets the app hold the page back (blur + scale) until the curtains part. */
  onPhaseChange?: (phase: IntroPhase) => void;
}

/** Flip to true if you'd rather only greet people once per browser tab. */
const PLAY_ONCE_PER_SESSION = false;
const SESSION_KEY = "khang_intro_played";

/* ─── Timeline (ms, relative to the fonts being ready) ─── */
const T = {
  enso: 100,
  glyph: 420,
  seal: 1250,
  word: 1480,
  letterStep: 70,
  subtitle: 1950,
  shimmer: 2150,
  exit: 2600,
  exitDuration: 950,
} as const;

const WORDMARK = ["K", "H", "A", "N", "G"] as const;

/** Ash motes drifting up through the dark. */
const MOTES = [
  { left: "8%", bottom: "18%", size: 3, delay: 0, duration: 7 },
  { left: "17%", bottom: "8%", size: 2, delay: 1.4, duration: 6.2 },
  { left: "28%", bottom: "26%", size: 4, delay: 2.6, duration: 8 },
  { left: "39%", bottom: "12%", size: 2, delay: 0.7, duration: 6.8 },
  { left: "52%", bottom: "22%", size: 3, delay: 3.1, duration: 7.4 },
  { left: "63%", bottom: "9%", size: 2, delay: 1.9, duration: 6.5 },
  { left: "74%", bottom: "28%", size: 4, delay: 0.4, duration: 8.4 },
  { left: "83%", bottom: "15%", size: 2, delay: 2.2, duration: 7 },
  { left: "92%", bottom: "24%", size: 3, delay: 3.6, duration: 6.6 },
] as const;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function shouldSkipIntro(): boolean {
  if (prefersReducedMotion()) return true;
  if (!PLAY_ONCE_PER_SESSION) return false;
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

export default function IntroCurtain({ onPhaseChange }: Props) {
  // Decided once, before first paint, so the curtain never flashes.
  const [phase, setPhase] = useState<IntroPhase>(() =>
    shouldSkipIntro() ? "done" : "playing",
  );
  // Animations only start once the Chinese webfont is actually available,
  // otherwise 康 would be painted in a fallback face.
  const [ready, setReady] = useState(false);

  /**
   * Each phase owns exactly one timer, scheduled by its own effect below.
   * (Scheduling the "done" timer from inside `finish` would be wrong: the
   * state change re-runs the timeline effect, whose cleanup would clear the
   * timer that had just been queued, and the curtain would hang forever.)
   */
  const finish = useCallback(() => {
    setPhase((current) => (current === "playing" ? "exiting" : current));
  }, []);

  // Tell the app which phase we're in so it can release the page.
  useEffect(() => {
    onPhaseChange?.(phase);
    if (phase === "done" && PLAY_ONCE_PER_SESSION) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* private mode — just replay next time */
      }
    }
  }, [phase, onPhaseChange]);

  // Hold the page still while the curtain is up.
  useEffect(() => {
    if (phase === "done") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  // Wait for the webfont (max 700ms) before kicking the sequence off.
  useEffect(() => {
    if (phase !== "playing") return;
    let cancelled = false;
    const start = () => {
      if (!cancelled) setReady(true);
    };

    const fallback = window.setTimeout(start, 700);
    document.fonts?.ready
      .then(() => {
        window.clearTimeout(fallback);
        start();
      })
      .catch(start);

    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, [phase]);

  // Play out, then part the curtains.
  useEffect(() => {
    if (!ready || phase !== "playing") return;
    const id = window.setTimeout(finish, T.exit);
    return () => window.clearTimeout(id);
  }, [ready, phase, finish]);

  // Unmount once the panels have finished sliding off-screen.
  useEffect(() => {
    if (phase !== "exiting") return;
    const id = window.setTimeout(() => setPhase("done"), T.exitDuration);
    return () => window.clearTimeout(id);
  }, [phase]);

  // Let people out early.
  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (["Enter", "Escape", " ", "Spacebar"].includes(e.key)) {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, finish]);

  if (phase === "done") return null;

  const exiting = phase === "exiting";
  /** Animations are paused until `ready`, so nothing plays half-finished. */
  const run = (delay: number): React.CSSProperties =>
    ready
      ? { animationDelay: `${delay}ms` }
      : { animationPlayState: "paused", opacity: 0 };

  return (
    <div
      className={`fixed inset-0 z-[200] select-none${exiting ? " pointer-events-none" : ""}`}
      role="presentation"
      aria-hidden="true"
      data-intro-root=""
      data-intro-ready={ready ? "1" : "0"}
      onClick={exiting ? undefined : finish}
    >
      {/* ─── Curtain panels ─── */}
      {(["top", "bottom"] as const).map((side) => (
        <div
          key={side}
          className={[
            "absolute inset-x-0 h-1/2 overflow-hidden bg-khang-ink",
            side === "top" ? "top-0" : "bottom-0",
            exiting ? (side === "top" ? "intro-panel-up" : "intro-panel-down") : "",
          ].join(" ")}
        >
          {/* Paper grain + grid, doubled up so the seam lines up */}
          <div
            className="pattern-cny absolute inset-x-0 h-[200vh] opacity-[0.07]"
            style={{ top: side === "top" ? 0 : "-100vh" }}
          />
          {/* Jade glow bleeding from the centre line */}
          <div
            className="intro-glow absolute left-1/2 h-[70vh] w-[70vh] -translate-x-1/2 rounded-full"
            style={{
              [side === "top" ? "bottom" : "top"]: "-35vh",
              background:
                "radial-gradient(circle, rgba(22,163,74,0.30) 0%, rgba(21,128,61,0.12) 45%, transparent 70%)",
            }}
          />
        </div>
      ))}

      {/* ─── Ash motes ─── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {MOTES.map((m, i) => (
          <span
            key={i}
            className="intro-mote absolute rounded-full bg-emerald-300/70"
            style={{
              left: m.left,
              bottom: m.bottom,
              width: m.size,
              height: m.size,
              animationDelay: `${m.delay}s`,
              animationDuration: `${m.duration}s`,
              boxShadow: "0 0 8px rgba(16,185,129,0.8)",
            }}
          />
        ))}
      </div>

      {/* ─── Centre stack ─── */}
      <div
        className={`absolute inset-0 grid place-items-center px-6 ${
          exiting ? "intro-lift" : ""
        }`}
      >
        <div className="flex flex-col items-center">
          {/* Enso ring + 康 */}
          <div className="relative grid h-44 w-44 place-items-center sm:h-52 sm:w-52">
            {/* Steam curling off the top */}
            <div className="pointer-events-none absolute -top-6 left-1/2 flex -translate-x-1/2 gap-5">
              {[
                { delay: 0, height: 40 },
                { delay: 0.9, height: 56 },
                { delay: 1.8, height: 46 },
              ].map((wisp, i) => (
                <span
                  key={i}
                  className="intro-steam block w-[2px] rounded-full bg-gradient-to-t from-transparent via-white/30 to-transparent"
                  style={{
                    height: wisp.height,
                    animationDelay: `${1.6 + wisp.delay}s`,
                  }}
                />
              ))}
            </div>

            {/* The enso — two passes so the stroke reads as a brush */}
            <svg
              viewBox="0 0 120 120"
              className="intro-enso absolute inset-0 h-full w-full -rotate-90"
              fill="none"
            >
              <circle
                cx="60"
                cy="60"
                r="52"
                pathLength={100}
                stroke="rgba(22,163,74,0.35)"
                strokeWidth="7"
                strokeLinecap="round"
                style={run(T.enso)}
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                pathLength={100}
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinecap="round"
                style={run(T.enso + 60)}
              />
            </svg>

            {/* Wet-ink bleed behind the character */}
            <span
              className="intro-bleed absolute font-cn text-[5.5rem] text-emerald-400 sm:text-[6.5rem]"
              style={run(T.glyph)}
            >
              康
            </span>

            {/* The character itself, painted downwards */}
            <div className="relative">
              <span
                className="intro-glyph block font-cn text-[5.5rem] leading-none text-white sm:text-[6.5rem]"
                style={{
                  ...run(T.glyph),
                  textShadow: "0 0 30px rgba(16,185,129,0.55)",
                }}
              >
                康
              </span>
              {/* Brush tip travelling down the glyph. The clipping lives on
                  this wrapper alone — putting it on the glyph's own box would
                  crop the halo above. */}
              <span className="pointer-events-none absolute inset-0 overflow-hidden">
                <span
                  className="intro-tip absolute left-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{
                    ...run(T.glyph),
                    background:
                      "radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(16,185,129,0.45) 40%, transparent 70%)",
                    filter: "blur(6px)",
                  }}
                />
              </span>
            </div>

            {/* Seal stamp */}
            <div
              className="absolute -bottom-1 -right-1 grid h-12 w-12 place-items-center sm:h-14 sm:w-14"
              style={{ perspective: 400 }}
            >
              <span
                className="intro-shock absolute inset-0 rounded-xl border border-emerald-400/70"
                style={run(T.seal + 40)}
              />
              <span
                className="intro-stamp grid h-full w-full place-items-center rounded-xl bg-khang-red font-cn text-2xl text-white shadow-[0_8px_30px_rgba(21,128,61,0.55)] sm:text-[1.75rem]"
                style={run(T.seal)}
              >
                福
              </span>
            </div>
          </div>

          {/* Wordmark */}
          <div className="relative mt-9 overflow-hidden px-2">
            <h1 className="font-display text-[2.6rem] font-semibold leading-none tracking-[0.3em] text-white sm:text-6xl sm:tracking-[0.38em]">
              {WORDMARK.map((letter, i) => (
                <span
                  key={letter + i}
                  className="intro-letter"
                  style={run(T.word + i * T.letterStep)}
                >
                  {letter}
                </span>
              ))}
            </h1>
            {/* Sheen */}
            <span
              className="intro-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/3"
              style={{
                ...run(T.shimmer),
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)",
              }}
            />
          </div>

          {/* Subtitle between two hairlines */}
          <div className="mt-5 flex items-center gap-4">
            <span
              className="intro-rule h-px w-10 origin-right bg-gradient-to-l from-emerald-400/80 to-transparent sm:w-16"
              style={run(T.subtitle)}
            />
            <span
              className="intro-letter font-mono text-[9px] font-semibold uppercase tracking-[0.42em] text-white/70 sm:text-[11px]"
              style={run(T.subtitle + 80)}
            >
              Chinese · Dimsum
            </span>
            <span
              className="intro-rule h-px w-10 origin-left bg-gradient-to-r from-emerald-400/80 to-transparent sm:w-16"
              style={run(T.subtitle)}
            />
          </div>
        </div>
      </div>

      {/* ─── Loading hairline ─── */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-white/10">
        <div
          className="intro-progress h-full bg-gradient-to-r from-emerald-500 via-emerald-300 to-white"
          style={
            ready
              ? { animationDuration: `${T.exit}ms` }
              : { animationPlayState: "paused", transform: "scaleX(0)" }
          }
        />
      </div>

      {/* ─── Skip ─── */}
      {!exiting && (
        <button
          type="button"
          // The overlay is decorative and hidden from assistive tech, so this
          // button stays out of the tab order; Enter / Space / Esc skip too.
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            finish();
          }}
          className="absolute bottom-6 right-6 z-10 rounded-full border border-white/20 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50 transition hover:border-white/50 hover:text-white"
        >
          Skip
        </button>
      )}
    </div>
  );
}
