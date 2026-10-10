import { useCallback, useEffect, useState } from "react";

/**
 * ─────────────────────────────────────────────────────────────
 *  Khang entrance — two-act white-canvas intro
 * ─────────────────────────────────────────────────────────────
 *
 *  Act I — The Diner Eating (0.00s – 3.70s):
 *    0.00s  the black curtain opens into a crisp white background
 *    0.05s  tight 3.9x macro close-up on the person eating hot food
 *           (fork lifts bite into mouth, head tilts & chews happily,
 *           shoulders bounce, savour rays & jade spark pop, steam
 *           plumes & aroma puffs rise from the bowl)
 *    0.95s  sweeping 3.9x → 1x camera zoom-out revealing the full
 *           person at the table on the white background
 *    2.65s  full person holds on white while finishing their bite
 *    3.20s  the diner scene fades and scales away cleanly
 *
 *  Act II — The Logo & Name (3.55s – 7.35s, separate final card):
 *    3.55s  the ring scribes clockwise in the centre of the screen
 *    3.85s  the green medallion blooms inside it and 康 rises
 *    4.10s  Khang Dimsum lifts letter by letter from behind a mask
 *    4.70s  a hairline rule opens out from the centre
 *    4.90s  CHINESE RESTAURANT settles in from wide tracking
 *    5.50s  the finished lockup holds
 *    6.55s  it lifts away and opens onto the live site
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
const HOLD_MS = 6550;
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
      {/* Crisp white backdrop + opening black-to-white curtain transition */}
      <div className="intro-veil" />
      <div className="intro-black-curtain" />

      {/* ─── ACT I: The Diner Eating + Sweeping 3.9x Zoom-Out on White ─── */}
      <div className="intro-scene-diner">
        <div className="intro-diner-camera">
          <svg
            className="intro-diner"
            viewBox="0 0 600 440"
            aria-hidden="true"
          >
            {/* Solid horizontal table bar */}
            <rect x="44" y="384" width="512" height="30" fill="#0a0a0a" />

            {/* Left: Steaming bowl with rising S-curve waves & aroma puffs */}
            <g className="intro-diner-bowl">
              {/* Rising aroma puffs above the steam */}
              <g transform="translate(106, 250)">
                <circle className="intro-aroma-puff intro-aroma-puff-1" cx="-8" cy="0" r="3.5" fill="#15803d" />
                <circle className="intro-aroma-puff intro-aroma-puff-2" cx="8" cy="-6" r="2.8" fill="#0a0a0a" />
              </g>
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
              <g transform="translate(109, 343)">
                <g className="intro-bowl-body">
                  <path
                    d="M -45 -31 L 45 -31 C 44 -7, 34 9, 25 17 L 25 31 L -25 31 L -25 17 C -34 9, -44 -7, -45 -31 Z"
                    fill="#0a0a0a"
                  />
                </g>
              </g>
            </g>

            {/* Right: Mug with handle, sloshing drink & warm tea wisp */}
            <g className="intro-diner-mug">
              <g transform="translate(494, 282)">
                <path
                  className="intro-mug-steam"
                  d="M 0 10 C -4 5, -4 0, 0 -5 C 4 -10, 4 -15, 0 -20"
                  fill="none"
                  stroke="#0a0a0a"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              </g>
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

            {/* Center: Torso and resting right-side arm with happy shoulder bounce */}
            <g transform="translate(300, 374)">
              <g className="intro-diner-body">
                <path
                  d="M -87 0 L -87 -77 L -104 -65 L -87 -86 L -87 -140 C -87 -164, -60 -174, -35 -174 L 36 -174 C 52 -174, 66 -168, 77 -158 L 128 -114 C 141 -103, 143 -86, 138 -68 L 119 -14 C 114 0, 96 6, 81 2 C 66 -2, 60 -16, 63 -32 L 72 -82 L 65 -85 L 54 -32 C 50 -17, 54 -7, 62 0 Z"
                  fill="#0a0a0a"
                />
              </g>
            </g>

            {/* Head with white collar halo, happy eating nod & delight burst rays */}
            <g transform="translate(294, 148)">
              <g className="intro-diner-head">
                <circle cx="0" cy="0" r="78" fill="#ffffff" />
                <circle cx="0" cy="0" r="71" fill="#0a0a0a" />

                {/* Savour / delight burst rays & jade spark that pop on each bite */}
                <g transform="translate(78, -54)">
                  <g className="intro-delight-burst">
                    <line
                      x1="0"
                      y1="0"
                      x2="14"
                      y2="-14"
                      stroke="#0a0a0a"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                    <line
                      x1="6"
                      y1="10"
                      x2="24"
                      y2="6"
                      stroke="#15803d"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                    <line
                      x1="-10"
                      y1="-6"
                      x2="-6"
                      y2="-24"
                      stroke="#0a0a0a"
                      strokeWidth="4.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 24 -16 L 27 -9 L 34 -6 L 27 -3 L 24 4 L 21 -3 L 14 -6 L 21 -9 Z"
                      fill="#15803d"
                    />
                  </g>
                </g>
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

      {/* ─── ACT II: Separate Final Logo & Restaurant Name Card ─── */}
      <div className="intro-scene-brand">
        <div className="intro-lockup">
          {/* The mark: a ring that scribes, a disc that blooms */}
          <div className="intro-mark">
            <svg className="intro-ring" viewBox="0 0 120 120" aria-hidden="true">
              <circle className="intro-ring-path" cx="60" cy="60" r="56" />
            </svg>
            <span className="intro-disc" />
            <span className="intro-glyph">康</span>
          </div>

          {/* The name, lifting out from behind a mask */}
          <div className="intro-name">
            <span className="intro-line">{letters}</span>
          </div>

          <span className="intro-rule" />

          <div className="intro-sub">Chinese Restaurant</div>
        </div>
      </div>
    </div>
  );
}
