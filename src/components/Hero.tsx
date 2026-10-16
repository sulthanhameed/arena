import { useRef, useState } from "react";

function EntranceFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      if (video.ended) video.currentTime = 0;
      void video.play().catch(() => setPlaying(false));
    } else {
      video.pause();
    }
  };

  return (
    <div className="relative aspect-video overflow-hidden rounded-[1.7rem] border border-khang-ink/15 bg-[#fdfdfb] shadow-[0_24px_70px_rgba(10,10,10,0.12)] sm:rounded-[2rem]">
      <video
        ref={videoRef}
        className="h-full w-full object-cover"
        autoPlay
        muted
        playsInline
        preload="metadata"
        poster="/media/khang-entrance-poster.png"
        aria-label="Animated Khang Dim Sum Chinese Restaurant entrance film"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src="/media/khang-entrance.mp4" type="video/mp4" />
      </video>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between p-3 sm:p-5">
        <span className="rounded-full border border-khang-ink/10 bg-white/85 px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-khang-ink/55 backdrop-blur sm:px-3 sm:text-[9px]">
          Khang entrance film
        </span>
        <span className="rounded-full bg-khang-ink px-2.5 py-1 font-mono text-[8px] font-semibold uppercase tracking-[0.18em] text-white/90 sm:px-3 sm:text-[9px]">
          00:07
        </span>
      </div>

      <button
        type="button"
        onClick={togglePlayback}
        className="absolute bottom-3 right-3 rounded-full border border-khang-ink/10 bg-white/90 px-3 py-2 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-khang-ink shadow-sm backdrop-blur transition hover:bg-khang-ink hover:text-white sm:bottom-5 sm:right-5 sm:px-4 sm:text-[9px]"
        aria-label={playing ? "Pause the Khang entrance film" : "Play the Khang entrance film"}
      >
        {playing ? "Pause" : "Play"}
      </button>
    </div>
  );
}

export default function Hero() {
  return (
    <section
      id="home"
      className="relative isolate min-h-[100svh] overflow-hidden bg-white text-khang-ink"
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-5 top-5 h-20 w-20 border-l border-t border-khang-ink/15 sm:left-10 sm:top-10 sm:h-28 sm:w-28" />
        <div className="absolute bottom-5 right-5 h-20 w-20 border-b border-r border-khang-ink/15 sm:bottom-10 sm:right-10 sm:h-28 sm:w-28" />
        <div className="absolute left-1/2 top-0 h-24 w-px -translate-x-1/2 bg-khang-ink/10" />
        <div className="absolute bottom-0 left-1/2 h-24 w-px -translate-x-1/2 bg-khang-ink/10" />
        <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-khang-ink/[0.045] sm:h-[42rem] sm:w-[42rem]" />
        <div className="absolute left-1/2 top-1/2 h-[25rem] w-[25rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-khang-ink/[0.05] sm:h-[32rem] sm:w-[32rem]" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col items-center justify-center px-5 pb-20 pt-28 text-center sm:px-8 sm:pt-32">
        <div className="animate-fade-up font-mono text-[10px] font-semibold uppercase tracking-[0.38em] text-khang-ink/55 sm:text-[11px]">
          House of Dim Sum · Authentic Chinese Flavours
        </div>

        <div className="mt-6 w-full max-w-[58rem] animate-scale-in sm:mt-8">
          <EntranceFilm />
        </div>

        <div className="mt-6 animate-fade-up delay-100 sm:mt-7">
          <h1 className="font-display text-base font-semibold uppercase tracking-[0.2em] text-khang-ink sm:text-lg sm:tracking-[0.26em]">
            Khang Dim Sum Chinese Restaurant
          </h1>
          <p className="mx-auto mt-2 max-w-xl font-body text-[13px] font-light leading-relaxed text-khang-ink/60 sm:text-sm">
            A warm welcome to hand-folded dim sum, wok-fired favourites, and authentic Chinese hospitality.
          </p>
        </div>

        <div className="mt-6 flex animate-fade-up delay-200 flex-wrap items-center justify-center gap-3 sm:mt-7 sm:gap-4">
          <a
            href="#menu"
            className="group inline-flex items-center gap-3 rounded-full bg-khang-ink px-7 py-3.5 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:bg-khang-red sm:px-9 sm:py-4"
          >
            Explore the menu
            <span className="text-base transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
          </a>
          <a
            href="/media/khang-entrance.mp4"
            download="khang-dim-sum-entrance.mp4"
            className="rounded-full border border-khang-ink/20 bg-white px-7 py-3.5 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-khang-ink transition hover:border-khang-ink hover:bg-khang-ink hover:text-white sm:px-9 sm:py-4"
          >
            Download film
          </a>
        </div>
      </div>

      <a
        href="#menu"
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.28em] text-khang-ink/45 transition hover:text-khang-red sm:bottom-9"
      >
        Scroll to dine
        <span className="grid h-8 w-5 place-items-start rounded-full border border-khang-ink/25 p-1">
          <span className="h-1.5 w-1 animate-bounce rounded-full bg-khang-red" />
        </span>
      </a>
    </section>
  );
}
