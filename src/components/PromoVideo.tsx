import { PROMO_VIDEO } from "../data/menu";
import Reveal from "./Reveal";
import RevealText from "./RevealText";

export default function PromoVideo() {
  return (
    <section
      id="about"
      className="relative overflow-hidden bg-white py-24 sm:py-32"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-[1fr_1.1fr]">
          {/* ─── Left: text column ─── */}
          <div>
            <Reveal variant="fade" duration={500}>
              <div className="flex items-center gap-4">
                <span className="font-mono text-[11px] font-medium tracking-[0.3em] text-khang-ink/40">
                  — 03
                </span>
                <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-khang-ink/60">
                  Our Story
                </span>
                <span className="font-cn text-sm tracking-[0.15em] text-khang-red">
                  我们的故事
                </span>
              </div>
            </Reveal>

            <RevealText
              as="h2"
              className="mt-6 font-brush text-[2.25rem] font-medium leading-[1.1] tracking-[-0.02em] text-khang-ink sm:text-[3.5rem]"
              stagger={50}
              delay={100}
            >
              {`Three generations of authentic flavour.`}
            </RevealText>

            <Reveal variant="up" delay={250} duration={600}>
              <p className="mt-6 max-w-xl font-body text-[15px] font-light leading-[1.85] tracking-wide text-zinc-600">
                Born in a tiny street kitchen in Guangzhou, the Khang family
                recipe traveled across the seas to become a beloved name in
                Indian Chinese cuisine. Every wok‑toss, every fold of a
                dumpling carries our grandmother's secret blend of spices.
              </p>
            </Reveal>

            <dl className="mt-12 grid max-w-md grid-cols-3 gap-8">
              {[
                { num: "20+", label: "Years of Craft" },
                { num: "60+", label: "Signature Dishes" },
                { num: "10K+", label: "Happy Diners" },
              ].map((s, i) => (
                <Reveal
                  key={s.label}
                  variant="up"
                  delay={350 + i * 80}
                  duration={550}
                >
                  <div className="border-t border-khang-ink/15 pt-4">
                    <dt className="font-brush text-3xl font-medium tracking-tight text-khang-ink">
                      {s.num}
                    </dt>
                    <dd className="mt-2 font-mono text-[10px] font-medium uppercase tracking-[0.25em] text-khang-ink/50">
                      {s.label}
                    </dd>
                  </div>
                </Reveal>
              ))}
            </dl>

            <Reveal variant="up" delay={600} duration={550}>
              <a
                href="#menu"
                className="mt-12 inline-flex items-center gap-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-khang-ink underline-offset-8 transition hover:text-khang-red hover:underline"
              >
                Explore Our Menu
                <span aria-hidden>→</span>
              </a>
            </Reveal>
          </div>

          {/* ─── Right: video — gentle slide in from the right ─── */}
          <Reveal variant="right" delay={150} duration={700}>
            <div className="relative">
              <div className="relative aspect-[4/5] overflow-hidden rounded-3xl bg-zinc-100">
                {/* Video — always renders, never clipped */}
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                >
                  <source src={PROMO_VIDEO} type="video/mp4" />
                </video>

                <div className="absolute inset-0 bg-gradient-to-tr from-khang-ink/30 via-transparent to-transparent" />

                <Reveal variant="up" delay={600} duration={550}>
                  <div className="absolute bottom-6 right-6 font-cn text-7xl text-white/90 drop-shadow-2xl leading-none">
                    康
                  </div>
                </Reveal>

                <Reveal variant="right" delay={750} duration={550}>
                  <div className="absolute left-6 top-6 max-w-[240px] rounded-2xl border border-white/30 bg-white/10 p-4 backdrop-blur-md">
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-white/70">
                      Est. 2004
                    </div>
                    <div className="mt-2 font-brush text-base italic font-light leading-snug text-white">
                      "Food made with patience tastes of love."
                    </div>
                  </div>
                </Reveal>
              </div>

              <div className="pointer-events-none absolute -bottom-4 -right-4 -z-10 h-full w-full rounded-3xl border border-khang-ink/10" />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
