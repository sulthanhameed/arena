import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * ─────────────────────────────────────────────────────────────
 *  Khang entrance film — a cinematic pull-back
 * ─────────────────────────────────────────────────────────────
 *
 *  The camera retreats through the restaurant in five moves,
 *  each plate framed a little wider than the last, cross-dissolved
 *  so the whole thing reads as one continuous dolly-back:
 *
 *    0.00s  a dressed table mid-service — steamers, tea, steam
 *    1.15s  the banquette it sits in, under its paper lantern
 *    2.30s  the length of the dining room
 *    3.45s  the threshold, daylight spilling through open doors
 *    4.60s  the whole facade at dusk
 *    5.40s  the signboard lights and the name resolves on it
 *    6.90s  the film fades and the site settles into place
 *
 *  Skippable throughout; `prefers-reduced-motion` never mounts it.
 */

export type IntroPhase = "playing" | "exiting" | "done";

interface Props {
  /** Lets the app hold the page back (blur + scale) until the film ends. */
  onPhaseChange?: (phase: IntroPhase) => void;
}

/** A seven-second film is a lot to sit through twice. */
const PLAY_ONCE_PER_SESSION = true;
const SESSION_KEY = "khang_intro_played";

/* ─── The shot list ───────────────────────────────────────────
   `scale` runs from tight to wide: every shot is still easing
   outwards as the next one dissolves over it, which is what
   sells the retreat as continuous rather than as five stills. */
interface Shot {
  src: string;
  /** When the dissolve onto this shot begins (ms). */
  at: number;
  /** Scale at the start and end of the shot's own drift. */
  from: number;
  to: number;
  /** How long the drift takes — always outlives the shot on screen. */
  duration: number;
  alt: string;
}

const SHOTS: Shot[] = [
  {
    src: "/intro/shot-01-table.jpg",
    at: 0,
    from: 1.26,
    to: 1.08,
    duration: 2600,
    alt: "A table set with bamboo steamers and a teapot",
  },
  {
    src: "/intro/shot-02-booth.jpg",
    at: 1200,
    from: 1.2,
    to: 1.05,
    duration: 2500,
    alt: "A corner banquette beneath a paper lantern",
  },
  {
    src: "/intro/shot-03-room.jpg",
    at: 2400,
    from: 1.17,
    to: 1.04,
    duration: 2500,
    alt: "The dining room and its row of lanterns",
  },
  {
    src: "/intro/shot-04-threshold.jpg",
    at: 3600,
    from: 1.14,
    to: 1.03,
    duration: 2400,
    alt: "Daylight through the restaurant's open doors",
  },
  {
    src: "/intro/shot-05-facade.jpg",
    at: 4800,
    from: 1.12,
    to: 1.0,
    duration: 3400,
    alt: "The restaurant entrance at dusk",
  },
];

const FADE = 700; // cross-dissolve length, ms
const SIGN_AT = 5500; // the board lights up
const EXIT_AT = 7100; // the film starts handing over to the site
const EXIT_MS = 900; // and how long that takes

/** Shot 1 must be decoded before we start; the rest can arrive late. */
const FIRST_FRAME_TIMEOUT = 2600;

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

/** Resolves when the image is decoded, or rejects — never hangs. */
function preload(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

export default function IntroCinematic({ onPhaseChange }: Props) {
  // Decided before first paint, so the film never flashes in and out.
  const [phase, setPhase] = useState<IntroPhase>(() =>
    shouldSkipIntro() ? "done" : "playing",
  );
  // Nothing animates until the opening plate is actually on the wire.
  const [rolling, setRolling] = useState(false);

  /**
   * Each phase owns exactly one timer, scheduled by its own effect.
   * (Queueing the "done" timer from inside `finish` would be wrong:
   * the state change re-runs the timeline effect, whose cleanup would
   * clear the timer that had just been set, and the film would hang.)
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
        /* private mode — just play it again next time */
      }
    }
  }, [phase, onPhaseChange]);

  // Hold the page still while the film is up.
  useEffect(() => {
    if (phase === "done") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  // Wait for the opening plate, then roll. If it can't be fetched the
  // intro steps aside entirely rather than gating the site behind it.
  useEffect(() => {
    if (phase !== "playing") return;
    let cancelled = false;

    const timeout = new Promise<void>((_, reject) =>
      window.setTimeout(
        () => reject(new Error("first frame timed out")),
        FIRST_FRAME_TIMEOUT,
      ),
    );

    Promise.race([preload(SHOTS[0].src), timeout])
      .then(() => {
        if (!cancelled) setRolling(true);
      })
      .catch(() => {
        if (!cancelled) setPhase("done");
      });

    // The rest stream in behind the first shot; failures are harmless
    // because each plate only has to be there when it dissolves in.
    SHOTS.slice(1).forEach((shot) => void preload(shot.src).catch(() => {}));

    return () => {
      cancelled = true;
    };
  }, [phase]);

  // Roll out at the end of the film.
  useEffect(() => {
    if (!rolling || phase !== "playing") return;
    const id = window.setTimeout(finish, EXIT_AT);
    return () => window.clearTimeout(id);
  }, [rolling, phase, finish]);

  // Unmount once the hand-over to the site has finished.
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

  const exiting = phase === "exiting";

  /** Animations stay paused until the first plate is ready. */
  const cue = useMemo(
    () =>
      (delay: number, extra: React.CSSProperties = {}): React.CSSProperties =>
        rolling
          ? { animationDelay: `${delay}ms`, ...extra }
          : { animationPlayState: "paused", opacity: 0, ...extra },
    [rolling],
  );

  if (phase === "done") return null;

  return (
    <div
      className={`fixed inset-0 z-[200] select-none bg-khang-ink${
        exiting ? " pointer-events-none is-opening" : ""
      }`}
      role="presentation"
      aria-hidden="true"
      data-intro-root=""
      data-intro-ready={rolling ? "1" : "0"}
      onClick={exiting ? undefined : finish}
    >
      <div className="intro-film absolute inset-0 overflow-hidden">
        {/* ─── The shots ─── */}
        {SHOTS.map((shot, i) => (
          <div
            key={shot.src}
            className="intro-dissolve absolute inset-0"
            style={cue(shot.at, { ["--fade" as string]: `${FADE}ms` })}
          >
            <div
              className="intro-frame intro-shot"
              style={cue(shot.at, {
                ["--from" as string]: shot.from,
                ["--to" as string]: shot.to,
                ["--dur" as string]: `${shot.duration}ms`,
              })}
            >
              <img
                src={shot.src}
                alt={shot.alt}
                className="intro-plate"
                draggable={false}
                // The opening plate is what everyone waits on.
                fetchPriority={i === 0 ? "high" : "low"}
                decoding="async"
              />

              {/* The sign is parented to the facade plate, so it stays
                  welded to the board however the window is shaped. */}
              {i === SHOTS.length - 1 && (
                <>
                  <span
                    className="intro-sign-glow"
                    style={cue(SIGN_AT)}
                  />
                  <span className="intro-sign">
                    <span
                      className="intro-mark font-cn"
                      style={cue(SIGN_AT)}
                    >
                      康
                    </span>
                    <span
                      className="intro-name font-display"
                      style={cue(SIGN_AT + 220)}
                    >
                      KHANG
                    </span>
                    <span
                      className="intro-sign-rule"
                      style={cue(SIGN_AT + 440)}
                    />
                    <span
                      className="intro-sign-sub font-mono"
                      style={cue(SIGN_AT + 540, {
                        ["--fade" as string]: "700ms",
                      })}
                    >
                      Chinese · Dimsum
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        ))}

        {/* Grade + grain, tying the five plates into one piece of film */}
        <div className="intro-grade pointer-events-none absolute inset-0" />
        <div className="intro-grain pointer-events-none" />
      </div>

      {/* ─── Cinema bars ─── */}
      <div className="intro-bar intro-bar-top" />
      <div className="intro-bar intro-bar-bottom" />

      {/* ─── Progress hairline, along the inside of the bottom bar ─── */}
      <div
        className="absolute inset-x-0 h-px bg-white/10"
        style={{ bottom: "7vh" }}
      >
        <div
          className="intro-progress h-full bg-gradient-to-r from-amber-200/40 via-amber-100/70 to-white/90"
          style={
            rolling
              ? { animationDuration: `${EXIT_AT}ms` }
              : { animationPlayState: "paused", transform: "scaleX(0)" }
          }
        />
      </div>

      {/* ─── Skip ─── */}
      {!exiting && (
        <button
          type="button"
          // The film is decorative and hidden from assistive tech, so this
          // button stays out of the tab order; Enter / Space / Esc skip too.
          tabIndex={-1}
          onClick={(e) => {
            e.stopPropagation();
            finish();
          }}
          className="absolute right-6 z-10 rounded-full border border-white/25 bg-black/20 px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-white/60 backdrop-blur-sm transition hover:border-white/60 hover:text-white"
          style={{ bottom: "calc(7vh + 1.5rem)" }}
        >
          Skip
        </button>
      )}
    </div>
  );
}
