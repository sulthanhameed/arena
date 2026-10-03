// Kept the file name for compatibility, but now renders a minimal label
export default function GoldDivider({ label }: { label?: string }) {
  if (!label) {
    return (
      <div className="my-10 flex justify-center">
        <div className="h-px w-12 bg-khang-ink/20" />
      </div>
    );
  }
  return (
    <div className="my-10 flex items-center justify-center gap-4">
      <div className="h-px w-12 bg-khang-ink/20" />
      <span className="font-cn text-base tracking-[0.2em] text-khang-ink/40">
        {label}
      </span>
      <div className="h-px w-12 bg-khang-ink/20" />
    </div>
  );
}
