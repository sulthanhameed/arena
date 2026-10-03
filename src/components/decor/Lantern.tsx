interface Props {
  className?: string;
  size?: number;
  delay?: number;
}

export default function Lantern({ className = "", size = 80, delay = 0 }: Props) {
  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{ width: size, animationDelay: `${delay}s` }}
    >
      {/* String */}
      <div className="mx-auto h-10 w-px bg-gradient-to-b from-transparent to-black/60" />
      {/* Top cap */}
      <div className="mx-auto h-1.5 w-6 rounded-t bg-black" />
      {/* Body */}
      <div className="animate-lantern">
        <div
          className="animate-glow relative mx-auto rounded-[45%] bg-gradient-to-b from-emerald-500 via-green-700 to-green-900"
          style={{ width: size, height: size * 1.05 }}
        >
          {/* vertical seams */}
          <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-white/40" />
          <div className="absolute inset-y-2 left-[30%] w-px bg-white/30" />
          <div className="absolute inset-y-2 left-[70%] w-px bg-white/30" />
          {/* white rings */}
          <div className="absolute inset-x-0 top-1 mx-auto h-2 w-[80%] rounded-full bg-gradient-to-r from-black via-white to-black" />
          <div className="absolute inset-x-0 bottom-1 mx-auto h-2 w-[80%] rounded-full bg-gradient-to-r from-black via-white to-black" />
          {/* center character */}
          <div className="absolute inset-0 grid place-items-center font-brush text-white/90" style={{ fontSize: size * 0.4 }}>
            福
          </div>
        </div>
        {/* tassel */}
        <div className="mx-auto mt-1 h-6 w-1 rounded-full bg-gradient-to-b from-white to-black" />
        <div className="mx-auto h-3 w-3 rounded-full bg-white" />
      </div>
    </div>
  );
}
