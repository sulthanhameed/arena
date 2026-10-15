function KhangSeal() {
  return (
    <div
      className="relative grid h-36 w-36 place-items-center rounded-full border border-khang-ink bg-white shadow-[0_18px_55px_rgba(10,10,10,0.09)] sm:h-44 sm:w-44"
      aria-label="Khang restaurant logo"
      role="img"
    >
      {/* Custom restaurant mark: rising steam over a hand-folded dim sum. */}
      <svg
        viewBox="0 0 160 160"
        className="absolute inset-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)]"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="1" className="text-khang-ink/20" />
        <path
          d="M55 51c-8 10-8 20 0 29M80 42c-8 12-8 24 0 35M105 51c-8 10-8 20 0 29"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-khang-red"
        />
        <path
          d="M38 111c8-25 27-37 42-37s34 12 42 37"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-khang-ink"
        />
        <path
          d="M45 111h70M54 121h52"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-khang-ink/50"
        />
        <path
          d="M62 90c5 8 10 12 18 12s13-4 18-12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-khang-ink/40"
        />
      </svg>
      <span className="relative mt-1 font-cn text-[3.1rem] leading-none text-khang-ink sm:text-[3.8rem]">
        康
      </span>
    </div>
  );
}

export default function Hero() {
  return (
    <section
      id="home"
      className="relative isolate min-h-[100svh] overflow-hidden bg-white text-khang-ink"
    >
      {/* Fine-line decoration keeps the entrance white, calm, and intentional. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute left-5 top-5 h-20 w-20 border-l border-t border-khang-ink/15 sm:left-10 sm:top-10 sm:h-28 sm:w-28" />
        <div className="absolute bottom-5 right-5 h-20 w-20 border-b border-r border-khang-ink/15 sm:bottom-10 sm:right-10 sm:h-28 sm:w-28" />
        <div className="absolute left-1/2 top-0 h-24 w-px -translate-x-1/2 bg-khang-ink/10" />
        <div className="absolute bottom-0 left-1/2 h-24 w-px -translate-x-1/2 bg-khang-ink/10" />
        <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-khang-ink/[0.045] sm:h-[42rem] sm:w-[42rem]" />
        <div className="absolute left-1/2 top-1/2 h-[25rem] w-[25rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-khang-ink/[0.05] sm:h-[32rem] sm:w-[32rem]" />
      </div>

      <div className="relative mx-auto flex min-h-[100svh] max-w-5xl flex-col items-center justify-center px-5 pb-20 pt-28 text-center sm:px-8 sm:pt-32">
        <div className="animate-fade-up font-mono text-[10px] font-semibold uppercase tracking-[0.38em] text-khang-ink/55 sm:text-[11px]">
          House of Dim Sum · Authentic Chinese Flavours
        </div>

        <div className="mt-7 animate-scale-in sm:mt-9">
          <KhangSeal />
        </div>

        <div className="mt-8 animate-fade-up delay-100 sm:mt-10">
          <div className="font-cn text-2xl tracking-[0.25em] text-khang-red sm:text-3xl">
            康 · 点心 · 中餐
          </div>
          <h1 className="mt-3 font-brush text-[4.2rem] font-medium leading-[0.84] tracking-[-0.055em] text-khang-ink sm:mt-4 sm:text-[6.5rem] lg:text-[8.5rem]">
            Khang
          </h1>
          <div className="mt-5 flex items-center justify-center gap-3 sm:mt-6 sm:gap-5">
            <span className="h-px w-9 bg-khang-ink/25 sm:w-16" />
            <p className="font-display text-[11px] font-semibold uppercase tracking-[0.28em] text-khang-ink sm:text-sm sm:tracking-[0.36em]">
              Dim Sum
            </p>
            <span className="h-px w-9 bg-khang-ink/25 sm:w-16" />
          </div>
          <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-khang-red sm:mt-4 sm:text-[11px] sm:tracking-[0.38em]">
            Chinese Restaurant
          </p>
        </div>

        <p className="mt-8 max-w-md animate-fade-up delay-200 font-body text-[14px] font-light leading-[1.85] text-khang-ink/65 sm:mt-9 sm:text-[15px]">
          Khang Dim Sum Chinese Restaurant brings hand-folded dumplings,
          sizzling woks, and generous hospitality to every table.
        </p>

        <div className="mt-9 flex animate-fade-up delay-300 flex-wrap items-center justify-center gap-3 sm:mt-10 sm:gap-4">
          <a
            href="#menu"
            className="group inline-flex items-center gap-3 rounded-full bg-khang-ink px-7 py-3.5 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:-translate-y-0.5 hover:bg-khang-red sm:px-9 sm:py-4"
          >
            Explore the menu
            <span className="text-base transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>
          </a>
          <a
            href="#about"
            className="rounded-full border border-khang-ink/20 bg-white px-7 py-3.5 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-khang-ink transition hover:border-khang-ink hover:bg-khang-ink hover:text-white sm:px-9 sm:py-4"
          >
            Our story
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
