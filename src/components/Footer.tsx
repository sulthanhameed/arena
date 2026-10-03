import { MapPinIcon, PhoneIcon } from "./Icons";
import Reveal from "./Reveal";
import RevealText from "./RevealText";

export default function Footer() {
  return (
    <footer id="contact" className="relative overflow-hidden bg-khang-ink text-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
        {/* Large brand statement */}
        <div className="grid gap-12 border-b border-white/10 pb-16 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-[11px] font-medium tracking-[0.3em] text-white/40">
                — 08
              </span>
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
                Get in Touch
              </span>
              <span className="font-cn text-sm tracking-[0.15em] text-emerald-300">
                联系我们
              </span>
            </div>
            <RevealText
              as="h2"
              className="mt-6 font-brush text-[2.5rem] font-medium leading-[1.05] tracking-[-0.02em] sm:text-[4rem]"
              stagger={55}
              delay={100}
            >
              {`Visit us, call us, or just say hi.`}
            </RevealText>
          </div>

          {/* Newsletter inline */}
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
              Newsletter · 订阅
            </div>
            <p className="mt-4 font-body text-[14px] font-light leading-relaxed text-white/70">
              Subscribe for chef's specials and unlock{" "}
              <span className="text-white">10% off</span> your next order.
            </p>
            <form
              className="mt-5 flex items-center gap-2 border-b border-white/20 pb-3"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="your@email.com"
                className="flex-1 bg-transparent font-body text-sm tracking-wide text-white placeholder:text-white/40 outline-none"
              />
              <button className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300 transition hover:text-white">
                Subscribe →
              </button>
            </form>
          </div>
        </div>

        {/* Columns — each one fades up with a stagger on scroll */}
        <div className="mt-16 grid gap-12 lg:grid-cols-4">
          <Reveal variant="up" delay={0} duration={500}>
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-white">
                <span className="font-cn text-2xl text-khang-red leading-none">康</span>
              </div>
              <div>
                <div className="font-brush text-2xl font-medium leading-none">
                  Khang
                </div>
                <div className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.3em] text-white/50">
                  Chinese · Dimsum
                </div>
              </div>
            </div>
            <p className="mt-6 font-body text-[13px] font-light leading-[1.85] text-white/65">
              Three generations of master chefs. From our wok to your home —
              with every fold of a dumpling, a story.
            </p>
            <div className="mt-6 flex gap-2">
              {["IG", "FB", "TW", "YT"].map((s) => (
                <a
                  key={s}
                  href="#"
                  aria-label={s}
                  className="grid h-9 w-9 place-items-center rounded-full border border-white/15 font-mono text-[10px] font-semibold tracking-wider text-white/70 transition hover:border-white hover:bg-white hover:text-khang-ink"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
          </Reveal>

          <Reveal variant="up" delay={80} duration={500}>
          {/* Links */}
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
              Navigate
            </div>
            <ul className="mt-5 space-y-3.5 font-display text-[14px] font-medium">
              {["Home", "Menu", "About", "Services", "Contact"].map((l) => (
                <li key={l}>
                  <a
                    href="#"
                    className="text-white/70 underline-offset-4 transition hover:text-white hover:underline"
                  >
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          </Reveal>

          <Reveal variant="up" delay={160} duration={500}>
          {/* Categories */}
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
              Menu
            </div>
            <ul className="mt-5 space-y-3.5 font-display text-[14px] font-medium">
              {[
                "🥟 Dim Sum",
                "🍜 Noodles & Soups",
                "🍛 Rice & Curry",
                "🍟 Snacks",
                "🥤 Drinks",
              ].map((c) => (
                <li key={c}>
                  <a
                    href="#menu"
                    className="text-white/70 underline-offset-4 transition hover:text-white hover:underline"
                  >
                    {c}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          </Reveal>

          <Reveal variant="up" delay={240} duration={500}>
          {/* Contact */}
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
              Visit
            </div>
            <ul className="mt-5 space-y-5 font-body text-[14px] font-light leading-[1.75] text-white/70">
              <li className="flex gap-3">
                <MapPinIcon className="h-4 w-4 shrink-0 text-emerald-300" />
                <span>
                  Lane 7, Koregaon Park,<br />
                  Pune · 411001
                </span>
              </li>
              <li className="flex gap-3">
                <PhoneIcon className="h-4 w-4 shrink-0 text-emerald-300" />
                <span className="font-mono text-[13px] tracking-wider">
                  +91 98765 43210
                </span>
              </li>
              <li>
                <span className="font-display font-semibold text-white">Hours</span>
                <br />
                11:00 — 23:30 · Daily
              </li>
            </ul>
          </div>
          </Reveal>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 font-mono text-[11px] tracking-wide text-white/40 sm:flex-row">
          <div>
            © {new Date().getFullYear()} Khang Chinese Restaurant &amp; Dimsum
          </div>
          <div className="flex gap-6 uppercase tracking-[0.2em]">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Refunds</a>
          </div>
        </div>
      </div>

      {/* Massive faint Chinese character */}
      <div
        className="pointer-events-none absolute -bottom-32 right-0 font-cn text-[28rem] leading-none text-white/[0.025] select-none"
        aria-hidden
      >
        康
      </div>
    </footer>
  );
}
