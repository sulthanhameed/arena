import Reveal from "./Reveal";
import RevealText from "./RevealText";

interface Props {
  eyebrow: string;
  eyebrowCn?: string;
  title: React.ReactNode;
  description?: string;
  align?: "left" | "center";
  number?: string;
}

export default function SectionHeading({
  eyebrow,
  eyebrowCn,
  title,
  description,
  align = "center",
  number,
}: Props) {
  return (
    <div
      className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : "text-left"}`}
    >
      {/* Eyebrow — quick fade */}
      <Reveal variant="fade" duration={500}>
        <div
          className={`flex items-center gap-4 ${align === "center" ? "justify-center" : ""}`}
        >
          {number && (
            <span className="font-mono text-[11px] font-medium tracking-[0.3em] text-khang-ink/40">
              — {number}
            </span>
          )}
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.3em] text-khang-ink/60">
            {eyebrow}
          </span>
          {eyebrowCn && (
            <span className="font-cn text-sm tracking-[0.15em] text-khang-red">
              {eyebrowCn}
            </span>
          )}
        </div>
      </Reveal>

      {/* Headline — quick word-by-word reveal */}
      <RevealText
        as="h2"
        className="mt-6 font-brush text-[2.25rem] font-medium leading-[1.1] tracking-[-0.02em] text-khang-ink sm:text-[3.5rem]"
        stagger={45}
        delay={100}
      >
        {title}
      </RevealText>

      {description && (
        <Reveal variant="up" delay={250}>
          <p
            className={`mt-5 max-w-xl font-body text-[15px] font-light leading-[1.8] tracking-wide text-zinc-500 sm:text-base ${align === "center" ? "mx-auto" : ""}`}
          >
            {description}
          </p>
        </Reveal>
      )}
    </div>
  );
}
