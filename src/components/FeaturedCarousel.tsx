import { useMenu } from "../context/MenuContext";
import { StarIcon } from "./Icons";
import SectionHeading from "./SectionHeading";

export default function FeaturedCarousel() {
  const { menu } = useMenu();
  const featured = menu.filter((m) => m.featured);
  const loop = [...featured, ...featured, ...featured];

  return (
    <section className="relative overflow-hidden bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          number="01"
          eyebrow="Tonight's Specials"
          eyebrowCn="招牌菜"
          title={
            <>
              Khang <span className="italic font-light text-khang-red">Signature</span> Picks
            </>
          }
          description="A hand-picked selection from our master chefs — what locals queue up for."
        />
      </div>

      <div className="group relative mt-16">
        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-white to-transparent sm:w-40" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-white to-transparent sm:w-40" />

        <div className="flex w-max gap-6 px-6 animate-marquee marquee-pause">
          {loop.map((item, i) => (
            <article
              key={`${item.id}-${i}`}
              className="group/card relative w-72 shrink-0 overflow-hidden rounded-2xl border border-khang-ink/8 bg-white transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_20px_50px_rgba(10,10,10,0.08)]"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover/card:scale-105"
                  loading="lazy"
                />
                {/* Number badge top-left */}
                <span className="absolute left-4 top-4 font-mono text-[11px] font-semibold tracking-[0.2em] text-white drop-shadow">
                  / {String(i + 1).padStart(2, "0")}
                </span>
                {/* Category top-right */}
                <span className="absolute right-4 top-4 rounded-full bg-white/95 px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-khang-ink backdrop-blur">
                  {item.category}
                </span>
              </div>

              <div className="p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-cn text-sm tracking-wider text-khang-red">
                      {item.chineseName}
                    </div>
                    <h3 className="mt-1 truncate font-display text-base font-medium tracking-tight text-khang-ink">
                      {item.name}
                    </h3>
                  </div>
                  <div className="shrink-0 font-brush text-xl font-medium text-khang-ink">
                    ₹{item.price}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-khang-ink/8 pt-3">
                  <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-khang-ink/70">
                    <StarIcon className="h-3 w-3 text-khang-red" />
                    {item.rating}
                    <span className="text-khang-ink/40">· {item.reviews}</span>
                  </div>
                  <a
                    href="#menu"
                    className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-khang-ink underline-offset-4 transition hover:text-khang-red hover:underline"
                  >
                    Order →
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
