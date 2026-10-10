import { useCallback, useEffect, useState } from "react";

/**
 * ─────────────────────────────────────────────────────────────
 *  Khang entrance — white-canvas diner & brand reveal
 * ─────────────────────────────────────────────────────────────
 *
 *  Choreography (~5.35s total):
 *    0.00s  the black curtain opens into a crisp white background
 *    0.15s  close-up on the diner eating hot food from the steaming
 *           bowl (fork lifts bite to mouth, head nods, steam curls)
 *    1.25s  camera smoothly zooms out to show the full person at the
 *           table on the white background
 *    1.40s  above the diner, the ring scribes clockwise, the green
 *           medallion blooms with 康, Khang Dimsum lifts letter by
 *           letter in ink black, the rule opens, and CHINESE RESTAURANT
 *           settles in
 *    2.85s  full lockup + full diner hold together on white
 *    4.55s  the stage lifts away and opens onto the live site
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

/** EXIT_MS must match the `.is-opening` animation duration in index.css. */
const HOLD_MS = 4550;
const EXIT_MS = 800;

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
  const [phase, setPhase] = useState<IntroPhase>(() =>
    shouldSkipIntro() ? "done" : "playing",
  );

  const finish = useCallback(() => {
    setPhase((current) => (current === "playing" ? "exiting" : current));
  }, []);

  useEffect(() => {
    onPhaseChange?.(phase);
    if (phase === "done" && PLAY_ONCE_PER_SESSION) {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* private mode — play again next time */
      }
    }
  }, [phase, onPhaseChange]);

  useEffect(() => {
    if (phase === "done") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

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
      {/* White backdrop + opening black-to-white curtain transition */}
      <div className="intro-veil" />
      <div className="intro-black-curtain" />

      {/* Camera stage: starts zoomed in on the eating person, then zooms out
          to reveal the full person at the table + brand lockup on white */}
      <div className="intro-stage">
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

        {/* ─── The diner eating at the table (animated vector pictogram) ─── */}
        <div className="intro-diner-wrap">
          <svg
            className="intro-diner"
            viewBox="0 0 600 440"
            aria-hidden="true"
          >
            {/* Solid horizontal table bar */}
            <rect x="44" y="384" width="512" height="30" fill="#0a0a0a" />

            {/* Left: Steaming bowl with rising S-curve steam waves */}
            <g className="intro-diner-bowl">
              <g transform="translate(99, 278)">
                <g className="intro-steam-wave intro-steam-wave-1">
                  <path
                    d="M 0 21 C -6 13, -6 6, 0 0 C 6 -6, 6 -13, -1 -21 C 2 -13, 1 -7, -4 -1 C -10 6, -10 13, 0 21 Z"
                    fill="#0a0a0a"
                    stroke="#0a0a0a"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </g>
              <g transform="translate(113, 278)">
                <g className="intro-steam-wave intro-steam-wave-2">
                  <path
                    d="M 0 21 C -6 13, -6 6, 0 0 C 6 -6, 6 -13, -1 -21 C 2 -13, 1 -7, -4 -1 C -10 6, -10 13, 0 21 Z"
                    fill="#0a0a0a"
                    stroke="#0a0a0a"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              </g>
              <path
                d="M 64 312 L 154 312 C 153 336, 143 352, 134 360 L 134 374 L 84 374 L 84 360 C 75 352, 65 336, 64 312 Z"
                fill="#0a0a0a"
              />
            </g>

            {/* Right: Mug with handle & half-filled drink */}
            <g className="intro-diner-mug">
              <path
                d="M 521 314 C 542 314, 542 358, 521 358"
                fill="none"
                stroke="#0a0a0a"
                strokeWidth="8.5"
                strokeLinecap="round"
              />
              <rect x="466" y="298" width="57" height="76" rx="6" fill="#0a0a0a" />
              <rect x="474" y="306" width="41" height="60" rx="2" fill="#ffffff" />
              <g transform="translate(494.5, 349.25)">
                <g className="intro-diner-liquid">
                  <rect x="-18" y="-14.25" width="36" height="28.5" fill="#0a0a0a" />
                </g>
              </g>
            </g>

            {/* Center: Torso and resting right-side arm */}
            <g className="intro-diner-body">
              <path
                d="M 213 374 L 213 297 L 196 309 L 213 288 L 213 234 C 213 210, 240 200, 265 200 L 336 200 C 352 200, 366 206, 377 216 L 428 260 C 441 271, 443 288, 438 306 L 419 360 C 414 374, 396 380, 381 376 C 366 372, 360 358, 363 342 L 372 292 L 365 289 L 354 342 C 350 357, 354 367, 362 374 Z"
                fill="#0a0a0a"
              />
            </g>

            {/* Head with white collar halo and happy eating nod */}
            <g transform="translate(294, 148)">
              <g className="intro-diner-head">
                <circle cx="0" cy="0" r="78" fill="#ffffff" />
                <circle cx="0" cy="0" r="71" fill="#0a0a0a" />
              </g>
            </g>

            {/* Eating arm + 3-tine fork + food bite pivoting around (164, 284) */}
            <g transform="translate(164, 284)">
              <g className="intro-diner-arm-eat">
                {/* White cutout border around the forearm */}
                <line
                  x1="0"
                  y1="0"
                  x2="72"
                  y2="-58"
                  stroke="#ffffff"
                  strokeWidth="74"
                  strokeLinecap="round"
                />
                {/* Fork + food bite aligned along the forearm angle (-36 deg) */}
                <g transform="translate(103, -83) rotate(-36)">
                  <rect x="-26" y="-5.5" width="22" height="11" rx="2" fill="#ffffff" />
                  <rect x="-8" y="-12.5" width="28" height="25" rx="4.5" fill="#ffffff" />
                  <g transform="translate(32, -1) rotate(20)">
                    <g className="intro-diner-bite">
                      <ellipse cx="0" cy="0" rx="18.5" ry="12" fill="#ffffff" />
                    </g>
                  </g>
                  <rect x="-26" y="-2.8" width="22" height="5.6" rx="1.5" fill="#0a0a0a" />
                  <rect x="-5" y="-9.5" width="11" height="19" rx="3" fill="#0a0a0a" />
                  <rect x="4" y="-9.5" width="16" height="3.8" rx="1.6" fill="#0a0a0a" />
                  <rect x="4" y="-1.9" width="16" height="3.8" rx="1.6" fill="#0a0a0a" />
                  <rect x="4" y="5.7" width="16" height="3.8" rx="1.6" fill="#0a0a0a" />
                </g>
                {/* Solid black forearm capsule */}
                <line
                  x1="0"
                  y1="0"
                  x2="72"
                  y2="-58"
                  stroke="#0a0a0a"
                  strokeWidth="60"
                  strokeLinecap="round"
                />
              </g>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
