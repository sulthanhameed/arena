import { useState } from "react";
import { MENU, type FoodItem } from "../data/menu";
import { FlameIcon, StarIcon } from "./Icons";

// Fixed position slots — center + 4 around
type Slot = "center" | "tr" | "bl" | "tl" | "br";

/**
 * Pixel-precise positions inside the 460×460 showcase frame.
 * Using top/left so we can transition them smoothly with CSS.
 * Each value is the CENTER of the dish circle.
 */
const SLOT_POS: Record<Slot, { left: number; top: number; size: number; z: number }> = {
  center: { left: 230, top: 230, size: 280, z: 20 },
  tr:     { left: 400, top:  60, size: 110, z: 30 },
  bl:     { left:  60, top: 380, size: 110, z: 30 },
  tl:     { left:  70, top:  85, size:  96, z: 30 },
  br:     { left: 400, top: 400, size:  96, z: 30 },
};

export default function Hero() {
  // Top 5 featured for the showcase
  const featured = MENU.filter((m) => m.featured);
  const pool = [...featured].sort((a, b) => b.rating - a.rating).slice(0, 5);

  // Map slot -> food item — same slots, but we'll key each rendered dish by its ID
  // so React keeps the SAME DOM node across re-renders, letting CSS transition
  // its position from old slot to new slot smoothly.
  const [slots, setSlots] = useState<Record<Slot, FoodItem>>({
    center: pool[0],
    tr: pool[1],
    bl: pool[2],
    tl: pool[3],
    br: pool[4],
  });
  const [animating, setAnimating] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // Reverse map: foodId -> slot
  const idToSlot = (id: string): Slot => {
    return (Object.keys(slots) as Slot[]).find(
      (s) => slots[s].id === id,
    ) as Slot;
  };

  const swap = (clicked: Slot) => {
    if (clicked === "center" || animating) return;
    setAnimating(true);
    setHighlightId(slots[clicked].id);

    // Instantly swap state — but because each dish is keyed by its food id,
    // React re-uses the same DOM node and CSS animates left/top/size.
    setSlots((prev) => {
      const next = { ...prev };
      const tmp = next.center;
      next.center = prev[clicked];
      next[clicked] = tmp;
      return next;
    });

    // Lock interactions until the CSS transition finishes
    setTimeout(() => {
      setAnimating(false);
      setHighlightId(null);
    }, 800);
  };

  return (
    <section
      id="home"
      className="relative min-h-screen w-full overflow-hidden bg-white"
    >
      {/* ─── Modern animated gradient mesh background ─── */}
      <div className="absolute inset-0 -z-10 bg-white">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[40rem] w-[40rem] rounded-full bg-emerald-300/40 blur-3xl" />
        <div className="absolute left-1/3 top-1/3 h-96 w-96 rounded-full bg-lime-200/30 blur-3xl" />
      </div>

      {/* Dotted grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(6,78,46,0.5) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Faint Chinese characters */}
      <div className="pointer-events-none absolute left-2 top-1/4 -z-10 hidden font-cn text-[18rem] leading-none text-emerald-900/[0.04] lg:block">
        福
      </div>
      <div className="pointer-events-none absolute right-2 bottom-1/4 -z-10 hidden font-cn text-[18rem] leading-none text-emerald-900/[0.04] lg:block">
        康
      </div>

      {/* ─── Content ─── */}
      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-12 px-4 pb-16 pt-32 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:px-8 lg:pt-36">
        {/* ─── Left: text content ─── */}
        <div className="relative z-10">
          <div className="inline-flex animate-fade-up items-center gap-3 rounded-full border border-emerald-200 bg-white/70 px-5 py-2 font-mono tracking-eyebrow text-khang-red shadow-sm backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-cn text-sm tracking-[0.15em]">欢迎光临</span>
            <span className="h-3 w-px bg-emerald-300" />
            Now Delivering
          </div>

          <h1 className="mt-8 animate-fade-up delay-100 font-brush tracking-display text-[3.25rem] leading-[1.02] text-khang-ink sm:text-[4.5rem] lg:text-[5.5rem]">
            Authentic
            <br />
            <span className="italic font-light text-khang-red">Chinese</span>{" "}
            flavors,
            <br />
            <span className="font-display font-light">crafted</span>{" "}
            <span className="font-brush font-medium">fresh.</span>
          </h1>

          <p className="mt-7 max-w-lg animate-fade-up delay-200 font-body text-base font-light leading-[1.85] tracking-wide text-zinc-600 sm:text-[17px]">
            Hand‑folded dim sum, wok‑tossed noodles &amp; sizzling specialities —
            the soul of Canton &amp; Sichuan, delivered to your door in 30 minutes.
          </p>

          <div className="mt-10 flex animate-fade-up delay-300 flex-wrap items-center gap-4">
            <a
              href="#menu"
              className="group relative overflow-hidden rounded-full bg-khang-ink px-10 py-4 font-display text-[0.95rem] font-semibold uppercase tracking-[0.15em] text-white shadow-[0_10px_40px_rgba(10,10,10,0.25)] transition hover:scale-105 hover:bg-khang-red"
            >
              <span className="relative z-10 flex items-center gap-3">
                Order Now
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                >
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </span>
            </a>
            <a
              href="#about"
              className="group inline-flex items-center gap-3 rounded-full border border-khang-ink/15 bg-white/70 px-8 py-3.5 font-display text-[0.95rem] font-medium uppercase tracking-[0.15em] text-khang-ink backdrop-blur-md transition hover:border-khang-red hover:text-khang-red"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 transition group-hover:bg-khang-red group-hover:text-white">
                ▶
              </span>
              Our Story
            </a>
          </div>

          {/* Stats / Trust strip */}
          <div className="mt-12 grid animate-fade-up delay-400 max-w-lg grid-cols-3 gap-6 border-t border-emerald-200/60 pt-8">
            <Stat number="4.6★" label="583 Reviews" />
            <Stat number="10K+" label="Orders / mo" />
            <Stat number="30 min" label="Avg Delivery" />
          </div>

          {/* Hint about interactivity (desktop) */}
          <div className="mt-8 hidden animate-fade-up delay-500 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.25em] text-khang-ink/50 lg:flex">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Tap any dish on the right to swap it to the centre →
          </div>
        </div>

        {/* ─── Right: ANIMATED & INTERACTIVE food showcase ─── */}
        <div className="relative hidden h-[580px] lg:block">
          {/* Decorative dashed orbit ring */}
          <div
            className="absolute right-8 top-1/2 h-[460px] w-[460px] -translate-y-1/2 rounded-full border border-dashed border-emerald-300/60 animate-spin-slow"
            style={{ animationDuration: "60s" }}
          />

          {/* Solid inner circle backdrop */}
          <div className="absolute right-16 top-1/2 h-[340px] w-[340px] -translate-y-1/2 rounded-full border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white shadow-[0_30px_80px_rgba(6,78,46,0.18)]" />

          {/* Steam particles rising from center dish */}
          <div className="pointer-events-none absolute right-[220px] top-[140px] z-10">
            <div
              className="steam absolute h-3 w-3 rounded-full bg-white/70 blur-sm"
              style={{ animationDelay: "0s" }}
            />
            <div
              className="steam absolute left-4 h-2 w-2 rounded-full bg-white/60 blur-sm"
              style={{ animationDelay: "0.6s" }}
            />
            <div
              className="steam absolute left-8 h-2.5 w-2.5 rounded-full bg-white/65 blur-sm"
              style={{ animationDelay: "1.2s" }}
            />
            <div
              className="steam absolute left-12 h-2 w-2 rounded-full bg-white/55 blur-sm"
              style={{ animationDelay: "1.8s" }}
            />
          </div>

          {/* Inner showcase reference — anchored 460×460 box. Each dish floats
              freely inside it and physically slides between slots on click. */}
          <div className="absolute right-8 top-1/2 h-[460px] w-[460px] -translate-y-1/2">
            {/* Iterate over the FOOD ITEMS (not slots) and key by id, so React
                keeps the same DOM element when its slot changes — letting CSS
                smoothly transition top/left/width/height between positions. */}
            {pool.map((item) => {
              const slot = idToSlot(item.id);
              const pos = SLOT_POS[slot];
              const isCenter = slot === "center";
              const isHighlighted = highlightId === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => swap(slot)}
                  disabled={isCenter || animating}
                  aria-label={`Show ${item.name}`}
                  className={`group absolute -translate-x-1/2 -translate-y-1/2 ${
                    isCenter ? "cursor-default" : "cursor-pointer"
                  }`}
                  style={{
                    left: `${pos.left}px`,
                    top: `${pos.top}px`,
                    width: `${pos.size}px`,
                    height: `${pos.size}px`,
                    zIndex: isHighlighted ? 50 : pos.z,
                    // The actual flying animation — position + size all glide
                    transition:
                      "left 850ms cubic-bezier(0.34, 1.3, 0.4, 1), " +
                      "top 850ms cubic-bezier(0.34, 1.3, 0.4, 1), " +
                      "width 700ms cubic-bezier(0.22, 1, 0.36, 1), " +
                      "height 700ms cubic-bezier(0.22, 1, 0.36, 1)",
                    willChange: "left, top, width, height",
                  }}
                >
                  {/* Inner wrapper — handles visual treatments per state.
                      Crossfade between "center mode" and "side mode" treatments. */}
                  <div
                    className={`relative h-full w-full overflow-hidden rounded-full transition-all duration-700 ${
                      isCenter
                        ? "ring-8 ring-white shadow-[0_30px_60px_rgba(6,78,46,0.3)] animate-glow-soft"
                        : "ring-4 ring-white shadow-[0_15px_40px_rgba(6,78,46,0.2)] group-hover:ring-emerald-300 group-hover:shadow-[0_25px_55px_rgba(6,78,46,0.4)]"
                    } ${isHighlighted ? "scale-[1.08]" : ""}`}
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className={`h-full w-full object-cover transition-transform duration-700 ${
                        isCenter ? "animate-spin-slow" : "group-hover:scale-110"
                      }`}
                      style={isCenter ? { animationDuration: "50s" } : undefined}
                    />

                    {/* Center-only label — fades in once positioned at center */}
                    <div
                      className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-5 pt-12 text-center text-white transition-opacity duration-500 ${
                        isCenter ? "opacity-100 delay-200" : "opacity-0"
                      }`}
                    >
                      <div className="font-cn text-lg tracking-wider text-emerald-200">
                        {item.chineseName}
                      </div>
                      <div className="font-display text-sm font-semibold tracking-tight">
                        {item.name}
                      </div>
                      <div className="mt-1 inline-flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.15em] text-emerald-200">
                        <StarIcon className="h-3 w-3" />
                        {item.rating} · ₹{item.price}
                      </div>
                    </div>

                    {/* Side-only hover overlay */}
                    {!isCenter && (
                      <div className="pointer-events-none absolute inset-0 bg-khang-ink/0 transition duration-300 group-hover:bg-khang-ink/15" />
                    )}

                    {/* Highlight pulse ring while flying */}
                    {isHighlighted && (
                      <span className="pointer-events-none absolute inset-0 rounded-full ring-4 ring-emerald-400/70 animate-glow-soft" />
                    )}
                  </div>

                  {/* Side-only price chip (fades out when moving to center) */}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-khang-ink px-2.5 py-0.5 font-mono text-[10px] font-semibold text-white shadow-md transition-all duration-500 group-hover:bg-khang-red ${
                      isCenter
                        ? "-bottom-1 opacity-0"
                        : "-bottom-2 opacity-100"
                    }`}
                  >
                    ₹{item.price}
                  </div>

                  {/* Side-only hover tooltip */}
                  {!isCenter && (
                    <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-3 py-1 font-display text-[10px] font-semibold tracking-tight text-khang-ink opacity-0 shadow-lg ring-1 ring-emerald-100 transition group-hover:opacity-100">
                      {item.name}{" "}
                      <span className="text-khang-red">·</span>{" "}
                      <span className="font-mono text-[9px]">tap to swap</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* "Best Seller" pill — drifting horizontally */}
          <div className="absolute right-36 top-2 z-30 inline-flex animate-fade-up delay-500 items-center gap-2 rounded-full bg-khang-ink px-4 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-white shadow-lg animate-drift-x">
            <FlameIcon className="h-3 w-3 text-emerald-300" />
            Best Seller
          </div>

          {/* Price tag bubble — bottom right */}
          <div
            className="absolute bottom-32 right-2 z-30 grid h-20 w-20 animate-fade-up delay-500 place-items-center rounded-full bg-gradient-to-br from-khang-red to-khang-red-dark text-white shadow-xl ring-4 ring-white animate-float-soft"
            style={{ animationDelay: "1.5s" }}
          >
            <div className="text-center leading-none">
              <div className="font-mono text-[9px] uppercase tracking-[0.15em] text-white/70">
                from
              </div>
              <div className="mt-1 font-brush text-xl font-semibold">₹160</div>
            </div>
          </div>

          {/* "Fresh" rotating tag */}
          <div className="absolute left-0 bottom-2 z-30 animate-fade-up delay-500">
            <div
              className="relative h-20 w-20 animate-spin-slow"
              style={{ animationDuration: "20s" }}
            >
              <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
                <defs>
                  <path
                    id="circle-text"
                    d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
                  />
                </defs>
                <text className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] fill-khang-ink">
                  <textPath href="#circle-text">
                    ✦ Hand-crafted · Fresh daily ·
                  </textPath>
                </text>
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500 font-brush text-base font-medium text-white">
                  新
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Mobile food preview (only < lg) — also interactive ─── */}
        <div className="relative animate-fade-up delay-200 lg:hidden">
          {/* Featured large card */}
          <div className="relative mb-3 overflow-hidden rounded-3xl ring-1 ring-emerald-100 shadow-lg animate-float-softer">
            <img
              src={slots.center.image}
              alt={slots.center.name}
              className="aspect-[16/10] w-full object-cover transition-all duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-4 text-white">
              <div className="font-cn text-base tracking-wider text-emerald-200">
                {slots.center.chineseName}
              </div>
              <div className="font-display text-sm font-semibold tracking-tight">
                {slots.center.name}
              </div>
            </div>
            <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-0.5 font-mono text-[10px] font-semibold text-khang-ink shadow">
              <StarIcon className="h-3 w-3 text-khang-red" />
              {slots.center.rating}
            </div>
          </div>

          {/* 4-up grid below — click to swap into center */}
          <div className="grid grid-cols-4 gap-2">
            {(["tr", "bl", "tl", "br"] as Slot[]).map((s, i) => {
              const item = slots[s];
              return (
                <button
                  key={s}
                  onClick={() => swap(s)}
                  className={`group relative aspect-square overflow-hidden rounded-2xl ring-1 ring-emerald-100 shadow-md transition active:scale-95 ${
                    i % 2 === 0 ? "animate-float-soft" : "animate-float-softer"
                  }`}
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-active:scale-110"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <div className="text-center font-brush text-xs font-semibold text-white">
                      ₹{item.price}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 animate-fade-up delay-500">
        <a
          href="#menu"
          className="flex flex-col items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-khang-ink/50 transition hover:text-khang-red"
        >
          Scroll to explore
          <span className="grid h-8 w-5 place-items-start rounded-full border border-khang-ink/30 p-1">
            <span className="h-1.5 w-1 animate-bounce rounded-full bg-khang-red" />
          </span>
        </a>
      </div>
    </section>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div className="font-brush text-2xl font-semibold tracking-tight text-khang-ink sm:text-3xl">
        {number}
      </div>
      <div className="mt-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </div>
    </div>
  );
}
