import { useMemo, useState } from "react";
import type { Category, FoodItem } from "../data/menu";
import { useMenu } from "../context/MenuContext";
import FoodCard from "./FoodCard";
import Categories from "./Categories";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";
import RevealText from "./RevealText";

interface Props {
  onView: (item: FoodItem) => void;
}

export default function MenuSection({ onView }: Props) {
  const { menu, categories, loading, error, source } = useMenu();
  const [active, setActive] = useState<Category | "All">("All");
  const [sort, setSort] = useState<"popular" | "low" | "high">("popular");

  const items = useMemo(() => {
    let arr = active === "All" ? menu : menu.filter((m) => m.category === active);
    if (sort === "popular") arr = [...arr].sort((a, b) => b.rating - a.rating);
    if (sort === "low") arr = [...arr].sort((a, b) => a.price - b.price);
    if (sort === "high") arr = [...arr].sort((a, b) => b.price - a.price);
    return arr;
  }, [menu, active, sort]);

  return (
    <section
      id="menu"
      className="relative bg-white"
      data-menu-source={source}
      data-menu-loading={loading ? "1" : "0"}
      data-menu-count={items.length}
    >
      {/* Heading */}
      <div className="mx-auto max-w-7xl px-4 pt-24 sm:px-6 sm:pt-32 lg:px-8">
        <SectionHeading
          number="02"
          eyebrow={active === "All" ? "Full Menu" : active}
          eyebrowCn={active === "All" ? "全菜单" : "菜单"}
          title={
            active === "All" ? (
              <>
                Our <span className="italic font-light text-khang-red">Menu</span>
              </>
            ) : (
              active
            )
          }
          description="Crafted with passion & precision — every dish, every plate."
        />
      </div>

      {/* Category strip */}
      <div className="mt-16">
        <Categories active={active} onSelect={setActive} />
      </div>

      {/* Toolbar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <div className="font-mono text-[12px] tracking-wide text-khang-ink/60">
            <span className="font-semibold text-khang-ink">{items.length}</span>{" "}
            {items.length === 1 ? "dish" : "dishes"} ·{" "}
            <span className="uppercase tracking-[0.2em]">{active === "All" ? "Showing all" : active}</span>
          </div>

          <div className="flex items-center gap-1 rounded-full border border-khang-ink/10 bg-white p-1">
            {(
              [
                { id: "popular", label: "Popular" },
                { id: "low", label: "Price ↑" },
                { id: "high", label: "Price ↓" },
              ] as const
            ).map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={`rounded-full px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.15em] transition ${
                  sort === s.id
                    ? "bg-khang-ink text-white"
                    : "text-khang-ink/60 hover:text-khang-ink"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Where this menu actually came from. Silent on the happy path:
            only speaks up while loading, or when Supabase was configured
            and we had to fall back to the bundled copy. */}
        {loading && (
          <div className="mt-10 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-khang-red" />
            Loading the menu from Supabase…
          </div>
        )}
        {!loading && error && source === "offline" && (
          <div className="mt-10 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-body text-[13px] leading-relaxed text-amber-900">
            <span className="font-semibold">Showing the bundled menu.</span>{" "}
            Supabase is configured but the dishes could not be loaded — {error}
          </div>
        )}

        {/* Grid — each card reveals on scroll with a quick stagger */}
        <div
          className={`mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
            loading ? "opacity-50" : ""
          }`}
        >
          {items.map((item, i) => (
            <Reveal
              key={item.id}
              variant="up"
              delay={(i % 4) * 60}
              duration={500}
            >
              <FoodCard item={item} onView={onView} />
            </Reveal>
          ))}
        </div>

        {items.length === 0 && (
          <div className="py-20 text-center font-mono text-sm uppercase tracking-[0.25em] text-zinc-400">
            No items in this category yet.
          </div>
        )}

        {/* Promo strip — reveals on scroll with quick staggered elements */}
        <Reveal variant="zoom" duration={650} className="mt-24 mb-24 overflow-hidden rounded-3xl border border-khang-ink/10 bg-khang-ink p-10 text-white sm:p-16">
          <div className="grid items-center gap-10 md:grid-cols-[1.5fr_1fr]">
            <div>
              <Reveal variant="up" delay={100} duration={500}>
                <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
                  Free Delivery · 特别优惠
                </div>
              </Reveal>

              <RevealText
                as="h3"
                className="mt-5 font-brush text-3xl font-medium leading-[1.15] tracking-[-0.02em] sm:text-5xl"
                stagger={50}
                delay={200}
              >
                {`Order over ₹500 — delivery's on us.`}
              </RevealText>

              <Reveal variant="up" delay={400} duration={550}>
                <p className="mt-5 max-w-md font-body text-[15px] font-light leading-[1.8] text-white/70">
                  Plus a complimentary cup of jasmine tea with every order above
                  ₹800. Because hospitality is a tradition.
                </p>
              </Reveal>
            </div>

            <Reveal variant="left" delay={300} duration={650} className="flex flex-wrap gap-2 md:justify-end">
              {categories.map((c) => (
                <button
                  key={c.name}
                  onClick={() => setActive(c.name)}
                  className="rounded-full border border-white/15 bg-white/5 px-4 py-2 font-display text-[12px] font-medium tracking-wide text-white/85 backdrop-blur transition hover:border-white hover:bg-white hover:text-khang-ink"
                >
                  {c.icon}&nbsp;&nbsp;{c.name}
                </button>
              ))}
            </Reveal>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
