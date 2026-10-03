import { MENU, type FoodItem } from "../data/menu";
import SectionHeading from "./SectionHeading";
import { StarIcon } from "./Icons";
import ParallaxImage from "./ParallaxImage";
import Reveal from "./Reveal";

interface Props {
  onView: (item: FoodItem) => void;
}

export default function TopFoods({ onView }: Props) {
  const top = [...MENU].sort((a, b) => b.rating - a.rating).slice(0, 6);

  return (
    <section id="top" className="relative overflow-hidden bg-zinc-50 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          number="04"
          eyebrow="Top Rated"
          eyebrowCn="顶级美食"
          title={
            <>
              Most <span className="italic font-light text-khang-red">loved</span> dishes
            </>
          }
          description="Bestsellers, voted by thousands of foodies across the city."
        />

        <div className="mt-16 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {top.map((item, i) => (
            <Reveal
              key={item.id}
              variant="up"
              delay={(i % 3) * 80}
              duration={550}
            >
            <button
              onClick={() => onView(item)}
              className="group block w-full text-left"
            >
              {/* Image with parallax — the photo drifts vertically as you scroll */}
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-zinc-100">
                <ParallaxImage
                  src={item.image}
                  alt={item.name}
                  className="absolute inset-0 h-full w-full"
                  speed={180}
                  zoom={1.42}
                />

                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />

                {/* Rank number */}
                <div className="absolute right-5 top-5 font-brush text-7xl font-medium leading-none text-white drop-shadow-lg">
                  {String(i + 1).padStart(2, "0")}
                </div>

                {/* Chinese name */}
                <div className="absolute bottom-4 left-5 font-cn text-2xl tracking-wider text-white drop-shadow-lg">
                  {item.chineseName}
                </div>

                {/* Rating */}
                <div className="absolute bottom-4 right-5 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 font-mono text-[11px] font-semibold backdrop-blur">
                  <StarIcon className="h-3 w-3 text-khang-red" />
                  {item.rating}
                </div>
              </div>

              <div className="mt-5 flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-khang-ink/50">
                    {item.category}
                  </div>
                  <h3 className="mt-2 font-display text-[1.2rem] font-medium leading-snug tracking-tight text-khang-ink transition group-hover:text-khang-red">
                    {item.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 font-body text-[13px] font-light leading-relaxed text-zinc-500">
                    {item.description}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-brush text-2xl font-medium tracking-tight text-khang-ink">
                    ₹{item.price}
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-400">
                    incl. taxes
                  </div>
                </div>
              </div>

              <div className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-khang-ink underline-offset-4 transition group-hover:text-khang-red group-hover:underline">
                View Dish
                <span aria-hidden>→</span>
              </div>
            </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
