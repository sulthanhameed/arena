import { useEffect, useState } from "react";
import type { FoodItem } from "../data/menu";
import { useMenu } from "../context/MenuContext";
import { StarIcon } from "./Icons";

function KhangSeal() {
  return (
    <div
      className="relative grid h-28 w-28 place-items-center rounded-full border border-khang-ink bg-white shadow-[0_18px_55px_rgba(10,10,10,0.09)] sm:h-32 sm:w-32"
      aria-label="Khang restaurant logo"
      role="img"
    >
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
      </svg>
      <span className="relative mt-1 font-cn text-[2.6rem] leading-none text-khang-ink sm:text-3xl">
        康
      </span>
    </div>
  );
}

function featuredFoods(menu: FoodItem[]) {
  const featured = menu.filter((item) => item.featured);
  return (featured.length >= 3 ? featured : menu).slice(0, 3);
}

const FOOD_POSITIONS = [
  { left: "0%", top: "10%", width: "65%", height: "76%" },
  { left: "67%", top: "1%", width: "33%", height: "42%" },
  { left: "62%", top: "56%", width: "37%", height: "42%" },
] as const;

function FoodSwitcher() {
  const { menu } = useMenu();
  const [foods, setFoods] = useState<FoodItem[]>(() => featuredFoods(menu));
  const [moving, setMoving] = useState(false);
  const [featuredId, setFeaturedId] = useState<string | null>(null);

  useEffect(() => {
    setFoods(featuredFoods(menu));
  }, [menu]);

  const bringToFront = (position: number) => {
    if (position === 0 || moving || !foods[position]) return;

    setMoving(true);
    setFeaturedId(foods[position].id);
    setFoods((current) => {
      const next = [...current];
      [next[0], next[position]] = [next[position], next[0]];
      return next;
    });

    window.setTimeout(() => {
      setMoving(false);
      setFeaturedId(null);
    }, 720);
  };

  if (foods.length < 3) return null;

  return (
    <div className="w-full animate-fade-up delay-200 lg:max-w-[32rem]">
      <div className="relative mx-auto h-[23rem] w-full max-w-[29rem] sm:h-[30rem] lg:h-[31rem]">
        <div className="absolute left-[33%] top-[9%] h-[72%] w-[62%] rounded-full border border-khang-ink/[0.06]" />
        <div className="absolute left-[19%] top-[19%] h-[62%] w-[62%] rounded-full border border-dashed border-khang-ink/[0.13]" />

        {foods.map((food, index) => {
          const position = FOOD_POSITIONS[index];
          const isMain = index === 0;
          const isIncoming = featuredId === food.id;

          return (
            <button
              key={food.id}
              type="button"
              onClick={() => bringToFront(index)}
              disabled={moving || isMain}
              aria-label={isMain ? `${food.name} is featured` : `Feature ${food.name}`}
              className={`group absolute overflow-hidden rounded-[1.65rem] border border-white bg-white text-left shadow-[0_18px_45px_rgba(10,10,10,0.16)] transition-[left,top,width,height,transform,box-shadow] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isMain
                  ? "z-20 cursor-default ring-1 ring-khang-ink/10"
                  : "z-30 cursor-pointer hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(10,10,10,0.22)]"
              } ${isIncoming ? "z-40 scale-[1.025]" : ""}`}
              style={position}
            >
              <img
                src={food.image}
                alt={food.name}
                className={`h-full w-full object-cover transition-transform duration-700 ${
                  isMain ? "scale-100" : "group-hover:scale-110"
                }`}
              />
              <div className={`absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent ${isMain ? "opacity-100" : "opacity-75"}`} />

              {isMain ? (
                <div className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-6">
                  <div className="font-cn text-base tracking-wider text-emerald-200 sm:text-lg">
                    {food.chineseName}
                  </div>
                  <div className="mt-0.5 flex items-end justify-between gap-3">
                    <div>
                      <div className="font-display text-base font-semibold tracking-tight sm:text-lg">
                        {food.name}
                      </div>
                      <div className="mt-1 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold text-white/80">
                        <StarIcon className="h-3 w-3 text-emerald-300" />
                        {food.rating} · {food.prepTime}
                      </div>
                    </div>
                    <div className="font-brush text-2xl font-semibold">₹{food.price}</div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-3 pb-3 pt-9 text-white">
                    <div className="truncate font-display text-[11px] font-semibold tracking-tight sm:text-xs">
                      {food.name}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] font-semibold text-emerald-200">₹{food.price}</div>
                  </div>
                  <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white/95 px-2.5 py-1 font-mono text-[8px] font-bold uppercase tracking-[0.16em] text-khang-ink opacity-0 shadow transition-opacity group-hover:opacity-100 sm:text-[9px]">
                    Feature this
                  </span>
                </>
              )}
            </button>
          );
        })}

        <div className="absolute -left-1 top-[13%] z-40 hidden rounded-full border border-khang-ink/10 bg-white px-3 py-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-khang-ink/60 shadow-sm sm:block">
          Chef&apos;s picks
        </div>
      </div>

      <p className="mt-2 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-khang-ink/50 lg:text-left">
        Tap a side dish to move it into the featured position
      </p>
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
        <div className="absolute right-[8%] top-1/2 hidden h-[38rem] w-[38rem] -translate-y-1/2 rounded-full border border-khang-ink/[0.045] lg:block" />
        <div className="absolute right-[13%] top-1/2 hidden h-[29rem] w-[29rem] -translate-y-1/2 rounded-full border border-khang-ink/[0.05] lg:block" />
      </div>

      <div className="relative mx-auto grid min-h-[100svh] max-w-7xl items-center gap-7 px-5 pb-20 pt-28 sm:px-8 sm:pt-32 lg:grid-cols-[0.96fr_1.04fr] lg:gap-12 lg:px-10">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="animate-fade-up font-mono text-[10px] font-semibold uppercase tracking-[0.32em] text-khang-ink/55 sm:text-[11px]">
            House of Dim Sum · Authentic Chinese Flavours
          </div>

          <div className="mt-6 animate-scale-in sm:mt-8">
            <KhangSeal />
          </div>

          <div className="mt-7 animate-fade-up delay-100 sm:mt-8">
            <div className="font-cn text-2xl tracking-[0.25em] text-khang-red sm:text-3xl">
              康 · 点心 · 中餐
            </div>
            <h1 className="mt-3 font-brush text-[4.25rem] font-medium leading-[0.84] tracking-[-0.055em] text-khang-ink sm:mt-4 sm:text-[6.5rem] lg:text-[7.2rem]">
              Khang
            </h1>
            <div className="mt-5 flex items-center justify-center gap-3 lg:justify-start sm:mt-6 sm:gap-5">
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

          <p className="mt-7 max-w-md animate-fade-up delay-200 font-body text-[14px] font-light leading-[1.85] text-khang-ink/65 sm:mt-8 sm:text-[15px]">
            Khang Dim Sum Chinese Restaurant brings hand-folded dumplings,
            sizzling woks, and generous hospitality to every table.
          </p>

          <div className="mt-8 flex animate-fade-up delay-300 flex-wrap items-center justify-center gap-3 lg:justify-start sm:mt-9 sm:gap-4">
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

        <FoodSwitcher />
      </div>

      <a
        href="#menu"
        className="absolute bottom-5 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 font-mono text-[9px] font-semibold uppercase tracking-[0.28em] text-khang-ink/45 transition hover:text-khang-red sm:bottom-8"
      >
        Scroll to dine
        <span className="grid h-8 w-5 place-items-start rounded-full border border-khang-ink/25 p-1">
          <span className="h-1.5 w-1 animate-bounce rounded-full bg-khang-red" />
        </span>
      </a>
    </section>
  );
}
