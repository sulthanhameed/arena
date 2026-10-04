import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * ─────────────────────────────────────────────────────────────
 *  Khang entrance film
 * ─────────────────────────────────────────────────────────────
 *
 *  Opens on a guest enjoying her meal, then retreats out of the
 *  restaurant and finishes on the name above the door:
 *
 *    0.0s  she is mid-conversation at her table
 *    0.8s  she lifts a dumpling and takes a bite
 *    1.6s  she settles back, enjoying it
 *    2.5s  the camera pulls back down the dining room
 *    3.7s  past the threshold, daylight through the open doors
 *    4.9s  out to the whole facade at dusk
 *    5.65s the signboard lights and 康 / KHANG resolves on it
 *    7.2s  the film fades and the site settles into place
 *
 *  The three opening beats are layers of ONE shot, so they share a
 *  single unbroken camera move: cross-fading them reads as the guest
 *  moving rather than as three separate frames being swapped.
 *
 *  Skippable throughout; `prefers-reduced-motion` never mounts it.
 */

export type IntroPhase = "playing" | "exiting" | "done";

interface Props {
  /** Lets the app hold the page back (blur + scale) until the film ends. */
  onPhaseChange?: (phase: IntroPhase) => void;
}

/** Set true to greet each browser tab only once. Kept false so the film
 *  plays on every load — a "played" flag in sessionStorage survives tab
 *  reloads, which makes the intro look broken while you are working on it. */
const PLAY_ONCE_PER_SESSION = false;
const SESSION_KEY = "khang_intro_played";

/* ─── The shot list ───────────────────────────────────────────
   Every shot is framed wider than the last and still easing
   outwards as the next dissolves over it, which is what sells the
   retreat as one continuous move rather than six stills. */
interface Layer {
  src: string;
  /** When this layer dissolves in (ms from the start of the film). */
  at: number;
  alt: string;
  /** Overrides the standard dissolve. The guest's poses use a shorter
   *  one: at the full length the overlap ghosts her arm into two
   *  places at once instead of reading as a single movement. */
  fade?: number;
}

interface Shot {
  id: string;
  /** Scale at the start and end of this shot's own drift. */
  from: number;
  to: number;
  /** Always outlives the shot's time on screen, so it never sits still. */
  duration: number;
  /** Stacked frames sharing this shot's camera move. */
  layers: Layer[];
}

const SHOTS: Shot[] = [
  {
    id: "guest",
    from: 1.26,
    to: 1.06,
    duration: 3300,
    layers: [
      {
        src: "/intro/01-speaking.jpg",
        fade: 500,
        at: 0,
        alt: "A guest talking over a table of dim sum",
      },
      {
        src: "/intro/02-bite.jpg",
        fade: 500,
        at: 800,
        alt: "The guest lifting a dumpling with chopsticks",
      },
      {
        src: "/intro/03-enjoy.jpg",
        fade: 500,
        at: 1600,
        alt: "The guest enjoying her food",
      },
    ],
  },
  {
    id: "room",
    from: 1.16,
    to: 1.03,
    duration: 2700,
    layers: [
      {
        src: "/intro/04-room.jpg",
        at: 2500,
        alt: "The dining room and its row of lanterns",
      },
    ],
  },
  {
    id: "threshold",
    from: 1.13,
    to: 1.02,
    duration: 2600,
    layers: [
      {
        src: "/intro/05-threshold.jpg",
        at: 3700,
        alt: "Daylight through the restaurant's open doors",
      },
    ],
  },
  {
    id: "facade",
    from: 1.12,
    to: 1.0,
    duration: 3600,
    layers: [
      {
        src: "/intro/06-facade.jpg",
        at: 4900,
        alt: "The restaurant entrance at dusk",
      },
    ],
  },
];

const FADE = 700; // cross-dissolve length, ms
const SIGN_AT = 5650; // the board lights up
const EXIT_AT = 7200; // the film starts handing over to the site
const EXIT_MS = 900; // and how long that takes

/** The opening frame must be decoded before we start; the rest can arrive late. */
const FIRST_FRAME_TIMEOUT = 2600;
const FIRST_FRAME = SHOTS[0].layers[0].src;

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

/** Resolves when the image is in cache, or rejects — never hangs. */
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
  // Nothing animates until the opening frame is actually on the wire.
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

  // Wait for the opening frame, then roll. If it cannot be fetched the
  // film steps aside entirely rather than gating the site behind it.
  useEffect(() => {
    if (phase !== "playing") return;
    let cancelled = false;

    const timeout = new Promise<void>((_, reject) =>
      window.setTimeout(
        () => reject(new Error("first frame timed out")),
        FIRST_FRAME_TIMEOUT,
      ),
    );

    Promise.race([preload(FIRST_FRAME), timeout])
      .then(() => {
        if (!cancelled) setRolling(true);
      })
      .catch(() => {
        if (!cancelled) setPhase("done");
      });

    // The rest stream in behind it; each frame only has to be there by
    // the time it dissolves in, so failures here are harmless.
    SHOTS.flatMap((shot) => shot.layers)
      .filter((layer) => layer.src !== FIRST_FRAME)
      .forEach((layer) => void preload(layer.src).catch(() => {}));

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

  /** Animations stay paused until the opening frame is ready. */
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
        {SHOTS.map((shot) => (
          <div
            key={shot.id}
            className="intro-frame intro-shot"
            style={cue(shot.layers[0].at, {
              ["--from" as string]: shot.from,
              ["--to" as string]: shot.to,
              ["--dur" as string]: `${shot.duration}ms`,
            })}
          >
            {/* Layers share this shot's camera move, so cross-fading
                them reads as movement inside a single take. */}
            {shot.layers.map((layer) => (
              <img
                key={layer.src}
                src={layer.src}
                alt={layer.alt}
                className="intro-plate intro-dissolve"
                draggable={false}
                fetchPriority={layer.src === FIRST_FRAME ? "high" : "low"}
                decoding="async"
                style={cue(layer.at, {
                  ["--fade" as string]: `${layer.fade ?? FADE}ms`,
                })}
              />
            ))}

            {/* The sign is parented to the facade plate, so it stays
                welded to the board however the window is shaped. */}
            {shot.id === "facade" && (
              <>
                <span className="intro-sign-glow" style={cue(SIGN_AT)} />
                <span className="intro-sign">
                  <span className="intro-mark font-cn" style={cue(SIGN_AT)}>
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
        ))}

        {/* Grade + grain, tying the plates into one piece of film */}
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
