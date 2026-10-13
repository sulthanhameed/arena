import { useState } from "react";
import { MENU, type FoodItem } from "../data/menu";
import { SparkleIcon, StarIcon } from "./Icons";
import Reveal from "./Reveal";
import RevealText from "./RevealText";

interface Props {
  onView: (item: FoodItem) => void;
}

export default function ChefSurprise({ onView }: Props) {
  const [spinning, setSpinning] = useState(false);
  const [picked, setPicked] = useState<FoodItem | null>(null);
  const [displayIdx, setDisplayIdx] = useState(0);

  const spin = () => {
    setSpinning(true);
    setPicked(null);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayIdx(Math.floor(Math.random() * MENU.length));
      if (i > 28) {
        clearInterval(interval);
        const finalPick = MENU[Math.floor(Math.random() * MENU.length)];
        setPicked(finalPick);
        setDisplayIdx(MENU.indexOf(finalPick));
        setSpinning(false);
      }
    }, 80);
  };

  const current = MENU[displayIdx];

  return (
    <section
      id="services"
      className="relative overflow-hidden bg-white py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_1fr]">
          {/* Left — text reveals on scroll */}
          <div>
            <Reveal variant="fade" duration={500}>
              <div className="flex items-center gap-4">
                <span className="font-mono text-[11px] font-medium tracking-[0.3em] text-khang-ink/40">
                  — 05
                </span>
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-khang-ink/60">
                  Chef's Surprise
                </span>
                <span className="font-cn text-sm tracking-[0.15em] text-khang-red">
                  主厨惊喜
                </span>
              </div>
            </Reveal>

            <RevealText
              as="h2"
              className="mt-6 font-brush text-[2.25rem] font-medium leading-[1.1] tracking-[-0.02em] text-khang-ink sm:text-[3.5rem]"
              stagger={50}
              delay={100}
            >
              {`Let the chef surprise you tonight.`}
            </RevealText>

            <Reveal variant="up" delay={250} duration={550}>
              <p className="mt-6 max-w-md font-body text-[15px] font-light leading-[1.8] tracking-wide text-zinc-600">
                Can't decide? Tap below and our master chef will hand‑pick a
                dish from the menu — just for you.
              </p>
            </Reveal>

            <Reveal variant="up" delay={400} duration={550}>
              <button
                onClick={spin}
                disabled={spinning}
                className="mt-10 inline-flex items-center gap-3 rounded-full bg-khang-ink px-10 py-4 font-display text-[0.95rem] font-semibold uppercase tracking-[0.15em] text-white shadow-[0_10px_40px_rgba(10,10,10,0.2)] transition hover:scale-105 hover:bg-khang-red disabled:opacity-70"
              >
                <SparkleIcon
                  className={`h-4 w-4 ${spinning ? "animate-spin-slow" : ""}`}
                />
                {spinning ? "Spinning…" : picked ? "Spin Again" : "Surprise Me"}
              </button>
            </Reveal>

            <Reveal variant="fade" delay={550} duration={500}>
              <div className="mt-10 flex items-center gap-6 font-mono text-[11px] uppercase tracking-[0.2em] text-khang-ink/40">
                <span>{MENU.length} dishes</span>
                <span className="h-px w-8 bg-khang-ink/15" />
                <span>1 lucky pick</span>
              </div>
            </Reveal>
          </div>

          {/* Right card — slides in from the right */}
          <Reveal variant="right" delay={200} duration={700}>
            <div className="relative">
              <div
                className={`relative overflow-hidden rounded-3xl border border-khang-ink/10 bg-white transition-all duration-300 ${
                  spinning ? "scale-[0.98]" : "scale-100"
                }`}
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-zinc-50">
                  <img
                    key={current.id}
                    src={current.image}
                    alt={current.name}
                    className={`h-full w-full object-cover transition-all duration-200 ${
                      spinning ? "blur-sm scale-110" : ""
                    }`}
                  />
                  <div className="absolute bottom-5 left-5 font-cn text-3xl tracking-wider text-white drop-shadow-2xl">
                    {current.chineseName}
                  </div>
                  <div className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 font-mono text-[11px] font-semibold backdrop-blur">
                    <StarIcon className="h-3 w-3 text-khang-red" />
                    {current.rating}
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-khang-ink/50">
                      {current.category}
                    </div>
                    <div className="font-brush text-2xl font-medium tracking-tight text-khang-ink">
                      ₹{current.price}
                    </div>
                  </div>
                  <h3 className="mt-2 font-display text-xl font-medium leading-snug tracking-tight text-khang-ink">
                    {current.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 font-body text-[13px] font-light leading-relaxed text-zinc-500">
                    {current.description}
                  </p>
                  <button
                    onClick={() => picked && onView(picked)}
                    disabled={!picked}
                    className="mt-5 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-khang-ink underline-offset-4 transition hover:text-khang-red hover:underline disabled:opacity-40 disabled:no-underline"
                  >
                    View Dish <span aria-hidden>→</span>
                  </button>
                </div>
              </div>

              {picked && !spinning && (
                <div className="absolute -top-3 left-6 inline-flex animate-fade-up items-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg">
                  ✦ Your Pick
                </div>
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
