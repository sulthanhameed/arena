import { useCallback, useEffect, useState } from "react";

/**
 * ─────────────────────────────────────────────────────────────
 *  Khang entrance — the name and the mark
 * ─────────────────────────────────────────────────────────────
 *
 *  A four and a half second title card. It is the site's own
 *  lockup — the green roundel with 康, Khang Dimsum in Playfair,
 *  the tracked descriptor under it — assembled on screen rather
 *  than simply faded up:
 *
 *    0.15s  the ring scribes itself clockwise from the top
 *    0.55s  the green disc blooms inside it and 康 rises
 *    0.95s  the name lifts letter by letter from behind a mask
 *    1.65s  a hairline rule opens out from the centre
 *    1.95s  CHINESE RESTAURANT settles in from wide tracking
 *    2.55s  the finished lockup holds
 *    3.55s  it lifts away and the ink opens onto the site
 *
 *  This is vector and type, animated with CSS keyframes — no video
 *  file. A logo reveal is lines and letterforms, so it stays sharp
 *  at any viewport, costs nothing to download, and cannot fail to
 *  decode. The motion is real motion, not a cross-fade between
 *  stills: every part is transformed on its own curve.
 *
 *  There is no skip control: it is four seconds and
 *  `prefers-reduced-motion` never mounts it at all. A keyboard
 *  escape stays, unadvertised, so it can never trap anyone.
 */

export type IntroPhase = "playing" | "exiting" | "done";

interface Props {
  /** Lets the app hold the page back (blur + scale) until this ends. */
  onPhaseChange?: (phase: IntroPhase) => void;
}

/** Set true to greet each browser tab only once. Kept false so the
 *  entrance plays on every load. */
const PLAY_ONCE_PER_SESSION = false;
const SESSION_KEY = "khang_intro_played";

/** The lockup completes at 2.55s and holds for a beat before the
 *  hand-over. EXIT_MS must match the opening animation in index.css. */
const HOLD_MS = 3550;
const EXIT_MS = 850;

const NAME = "Khang Dimsum";

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

export default function IntroEntrance({ onPhaseChange }: Props) {
  // Decided before first paint, so it never flashes in and out.
  const [phase, setPhase] = useState<IntroPhase>(() =>
    shouldSkipIntro() ? "done" : "playing",
  );

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
        /* private mode — just play it again next time */
      }
    }
  }, [phase, onPhaseChange]);

  // Hold the page still while the card is up.
  useEffect(() => {
    if (phase === "done") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  /* Each phase owns exactly one timer, scheduled by its own effect.
     (Queueing the "done" timer from inside `finish` would be wrong:
     the state change re-runs the effect, whose cleanup would clear
     the timer that had just been set.) */
  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setTimeout(finish, HOLD_MS);
    return () => window.clearTimeout(id);
  }, [phase, finish]);

  useEffect(() => {
    if (phase !== "exiting") return;
    const id = window.setTimeout(() => setPhase("done"), EXIT_MS);
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

  /* The name is split so each letter can lift on its own delay.
     Spaces keep their width but are not animated targets. */
  let index = 0;
  const letters = [...NAME].map((ch, i) => {
    if (ch === " ") return <span key={i} className="intro-sp" />;
    const el = (
      <span
        key={i}
        className="intro-ch"
        style={{ ["--i" as string]: index }}
      >
        {ch}
      </span>
    );
    index += 1;
    return el;
  });

  return (
    <div
      className={`intro-root${phase === "exiting" ? " is-opening" : ""}`}
      role="presentation"
      aria-hidden="true"
      data-intro-root=""
      data-intro-phase={phase}
    >
      <div className="intro-veil" />

      <div className="intro-lockup">
        {/* ─── The mark: a ring that scribes, a disc that blooms ─── */}
        <div className="intro-mark">
          <svg className="intro-ring" viewBox="0 0 120 120" aria-hidden="true">
            <circle className="intro-ring-path" cx="60" cy="60" r="56" />
          </svg>
          <span className="intro-disc" />
          <span className="intro-glyph">康</span>
        </div>

        {/* ─── The name, lifting out from behind a mask ─── */}
        <div className="intro-name">
          <span className="intro-line">{letters}</span>
        </div>

        <span className="intro-rule" />

        <div className="intro-sub">Chinese Restaurant</div>
      </div>
    </div>
  );
}
