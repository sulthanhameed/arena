import { useCallback, useEffect, useRef, useState } from "react";

/**
 * ─────────────────────────────────────────────────────────────
 *  Khang entrance film
 * ─────────────────────────────────────────────────────────────
 *
 *  A nine second film, authored frame by frame in tools/intro-film
 *  and encoded to public/intro/khang-entrance.mp4 (+ .webm):
 *
 *    0.0s  two guests at a table, close; one of them is talking
 *    1.4s  the other lifts a dumpling with his chopsticks
 *    2.0s  he takes the bite, and goes on chewing
 *    2.8s  the camera begins to retreat, out through the window
 *    5.0s  the dining room, its lanterns and screens, come into view
 *    6.6s  the whole shopfront is in frame
 *    7.0s  the board lights and the logo resolves on it — the green
 *          roundel with 康, then KHANG and the descriptor
 *    9.7s  the film hands the page over to the site
 *
 *  It is one continuous camera move and one continuous performance
 *  — the picture is video, not a slideshow, so this component is
 *  deliberately thin: play it, follow it, and get out of the way.
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

const FILM_MP4 = "/intro/khang-entrance.mp4";
const FILM_WEBM = "/intro/khang-entrance.webm";
const FILM_POSTER = "/intro/poster.jpg";

/** Length of the film, and the moment the hand-over begins. The exit
 *  overlaps the last held beat on the sign, so the site arrives while
 *  the logo is still up rather than after a dead pause. */
const FILM_MS = 10000;
const EXIT_AT = 9700;
const EXIT_MS = 900;

/** If the first frame cannot be decoded and playing by now, the film
 *  stands aside: a blank hold is far worse than no intro at all. */
const START_TIMEOUT = 3000;

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

export default function IntroCinematic({ onPhaseChange }: Props) {
  // Decided before first paint, so the film never flashes in and out.
  const [phase, setPhase] = useState<IntroPhase>(() =>
    shouldSkipIntro() ? "done" : "playing",
  );
  // True once the video is actually running, not merely mounted.
  const [rolling, setRolling] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

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

  /* Start playback ourselves rather than trusting the autoplay
     attribute alone: muted inline autoplay is allowed everywhere we
     care about, but if a browser or an extension does refuse it, the
     rejection is our cue to release the site immediately instead of
     leaving the poster frozen over the page. */
  useEffect(() => {
    if (phase !== "playing") return;
    const video = videoRef.current;
    if (!video) return;
    let settled = false;
    let poll = 0;

    const give = () => {
      if (settled) return;
      settled = true;
      window.clearInterval(poll);
      setPhase("done");
    };

    const started = () => {
      if (settled) return;
      settled = true;
      window.clearInterval(poll);
      setRolling(true);
    };

    video.muted = true; // iOS only honours autoplay on a muted element
    const attempt = video.play();
    if (attempt && typeof attempt.catch === "function") attempt.catch(give);

    video.addEventListener("playing", started, { once: true });
    video.addEventListener("error", give, { once: true });

    /* When a <video> is fed by <source> children and they all fail, the
       error fires on the last <source>, never on the element itself —
       so the media element alone would leave us waiting. networkState
       settling on NO_SOURCE is the reliable signal that there is
       nothing to play, and it arrives in a few hundred milliseconds
       rather than at the end of the watchdog. */
    poll = window.setInterval(() => {
      if (video.networkState === video.NETWORK_NO_SOURCE) give();
    }, 150);

    const watchdog = window.setTimeout(() => {
      // Playing by now, just without a "playing" event we caught?
      if (!video.paused && video.currentTime > 0) started();
      else give();
    }, START_TIMEOUT);

    return () => {
      window.clearTimeout(watchdog);
      window.clearInterval(poll);
      video.removeEventListener("playing", started);
      video.removeEventListener("error", give);
    };
  }, [phase]);

  // Follow the picture: the hairline tracks the film's own clock.
  useEffect(() => {
    if (!rolling || phase !== "playing") return;
    const video = videoRef.current;
    if (!video) return;
    const onTime = () => {
      const length = Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : FILM_MS / 1000;
      setProgress(Math.min(1, video.currentTime / length));
    };
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("ended", finish);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("ended", finish);
    };
  }, [rolling, phase, finish]);

  // Roll out at the end of the film. Measured from the moment it
  // actually started, and backed up by `ended` above in case playback
  // stalls and runs long.
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

  if (phase === "done") return null;
  const exiting = phase === "exiting";

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
        <video
          ref={videoRef}
          className="intro-plate"
          // The attributes matter as much as the play() call: Safari
          // decides whether a video may autoplay from the markup.
          autoPlay
          muted
          playsInline
          preload="auto"
          poster={FILM_POSTER}
          disablePictureInPicture
          disableRemotePlayback
          tabIndex={-1}
        >
          <source src={FILM_WEBM} type="video/webm" />
          <source src={FILM_MP4} type="video/mp4" />
        </video>

        {/* Grade + grain, so the flat vector picture reads as film */}
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
          style={{ transform: `scaleX(${progress})` }}
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
