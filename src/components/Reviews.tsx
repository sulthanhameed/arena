import { StarIcon } from "./Icons";
import Reveal from "./Reveal";
import RevealText from "./RevealText";

const REVIEWS = [
  { name: "Aarav K.", text: "The Crystal Prawn Hargao melts in your mouth. Tastes exactly like the dim sum I had in Hong Kong!", rating: 5, location: "Mumbai" },
  { name: "Priya S.", text: "Honey Chilli Potato is dangerous — I can't stop ordering. Delivery was hot & quick.", rating: 5, location: "Bengaluru" },
  { name: "Rohan M.", text: "Authentic flavors, beautifully plated. The Chow Mein had that real wok-hei smokiness.", rating: 4, location: "Delhi" },
  { name: "Ananya R.", text: "Khang has become our weekly ritual. Their dim sum baskets are next level!", rating: 5, location: "Pune" },
  { name: "Karan V.", text: "Hot & Sour Soup is the best version I've ever had. Perfect on a rainy day.", rating: 5, location: "Hyderabad" },
  { name: "Sneha P.", text: "Love the packaging, love the food. Veg Manchurian was bursting with flavour.", rating: 4, location: "Chennai" },
  { name: "Vikram J.", text: "Chilli Chicken was perfectly crispy and spicy. The portion was generous too!", rating: 5, location: "Kolkata" },
  { name: "Meera D.", text: "Best Chinese delivery in town, hands down. Their jasmine tea is a lovely touch.", rating: 5, location: "Mumbai" },
];

export default function Reviews() {
  const loop = [...REVIEWS, ...REVIEWS];
  return (
    <section className="relative overflow-hidden bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-end justify-between gap-10 md:grid-cols-[1.3fr_1fr]">
          {/* Heading area — reveal on scroll */}
          <div>
            <Reveal variant="fade" duration={500}>
              <div className="flex items-center gap-4">
                <span className="font-mono text-[11px] font-medium tracking-[0.3em] text-khang-ink/40">
                  — 07
                </span>
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-khang-ink/60">
                  Voices of Joy
                </span>
                <span className="font-cn text-sm tracking-[0.15em] text-khang-red">
                  食客评价
                </span>
              </div>
            </Reveal>
            <RevealText
              as="h2"
              className="mt-6 font-brush text-[2.25rem] font-medium leading-[1.1] tracking-[-0.02em] text-khang-ink sm:text-[3.5rem]"
              stagger={50}
              delay={100}
            >
              {`Loved by 10,000+ foodies`}
            </RevealText>
          </div>

          {/* Rating block — slides in from the right */}
          <Reveal variant="left" delay={250} duration={650} className="rounded-3xl border border-khang-ink/10 bg-zinc-50 p-7">
            <div className="flex items-end gap-5">
              <div className="font-brush text-[5rem] font-medium tracking-tight text-khang-ink leading-none">
                4.6
              </div>
              <div className="mb-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon key={i} className="h-4 w-4 text-khang-red" />
                  ))}
                </div>
                <div className="mt-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-khang-ink/60">
                  583 verified reviews
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-khang-ink/10 pt-5">
              {[
                { n: "98%", l: "On Time" },
                { n: "92%", l: "Repeat Orders" },
                { n: "4.8★", l: "Food Quality" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-display text-lg font-semibold tracking-tight text-khang-ink">
                    {s.n}
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-khang-ink/50">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* Marquee reviews */}
      <div className="group relative mt-16">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-white to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-white to-transparent" />
        <div className="flex w-max gap-5 px-4 animate-marquee-slow marquee-pause">
          {loop.map((r, i) => (
            <article
              key={i}
              className="flex w-80 shrink-0 flex-col rounded-2xl border border-khang-ink/10 bg-white p-7 transition hover:border-khang-ink/30 hover:shadow-[0_20px_50px_-15px_rgba(10,10,10,0.1)]"
            >
              {/* Quote mark */}
              <div className="font-brush text-5xl font-medium leading-none text-khang-red/30">
                "
              </div>

              <p className="-mt-4 font-brush text-[16px] italic font-normal leading-[1.7] text-khang-ink">
                {r.text}
              </p>

              <div className="mt-auto flex items-center justify-between border-t border-khang-ink/8 pt-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-khang-ink font-display text-sm font-semibold text-white">
                    {r.name[0]}
                  </div>
                  <div>
                    <div className="font-display text-[13px] font-semibold tracking-tight text-khang-ink">
                      {r.name}
                    </div>
                    <div className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-khang-ink/50">
                      {r.location}
                    </div>
                  </div>
                </div>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, idx) => (
                    <StarIcon
                      key={idx}
                      className={`h-3.5 w-3.5 ${idx < r.rating ? "text-khang-red" : "text-zinc-200"}`}
                    />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
