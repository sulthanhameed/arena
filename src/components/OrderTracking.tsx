import { useState } from "react";
import { CheckIcon, ChefIcon, TruckIcon } from "./Icons";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";
import { ordersApi, type KhangTracking } from "../lib/api";
import { isSupabaseConfigured } from "../lib/supabase";
import type { OrderStatus } from "../types/database.types";

const STAGES = [
  { label: "Received", desc: "We got your order", icon: "📝" },
  { label: "Preparing", desc: "Wok is sizzling", icon: "🔥" },
  { label: "On the Way", desc: "Out for delivery", icon: "🚚" },
  { label: "Delivered", desc: "Enjoy your meal", icon: "🥢" },
];

const STAGE_INDEX: Record<OrderStatus, number> = {
  received: 0,
  preparing: 1,
  out_for_delivery: 2,
  delivered: 3,
  cancelled: 0,
};

function eta(info: KhangTracking | null): string {
  if (!info?.estimated_delivery) return "ETA · 25–35 min";
  if (info.status === "delivered") return "Delivered";
  const mins = Math.round((+new Date(info.estimated_delivery) - Date.now()) / 60000);
  return mins > 0 ? `ETA · ${mins} min` : "Arriving any moment";
}

export default function OrderTracking() {
  const [orderId, setOrderId] = useState("");
  const [tracking, setTracking] = useState(false);
  const [stage, setStage] = useState(0);
  const [info, setInfo] = useState<KhangTracking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Replays the demo animation when there is no Supabase project wired up. */
  const simulate = () => {
    setInfo(null);
    setTracking(true);
    setStage(0);
    for (let i = 1; i <= 3; i++) {
      window.setTimeout(() => setStage(i), i * 1500);
    }
  };

  const track = async () => {
    if (!orderId.trim()) return;
    setError(null);

    if (!isSupabaseConfigured) {
      simulate();
      return;
    }

    setLoading(true);
    try {
      // Public RPC — no sign-in required, returns status only (never the address)
      const result = await ordersApi.track(orderId.trim());
      setInfo(result);
      setStage(STAGE_INDEX[result.status] ?? 0);
      setTracking(true);
    } catch (err) {
      setInfo(null);
      setTracking(false);
      setError(err instanceof Error ? err.message : "Order not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="relative bg-zinc-50 py-24 sm:py-32">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          number="06"
          eyebrow="Live Tracking"
          eyebrowCn="跟踪订单"
          title={
            <>
              Track your <span className="italic font-light text-khang-red">order</span>
            </>
          }
          description="Enter your Order ID to see exactly where your meal is, in real time."
        />

        {/* Tracker card — reveals from below on scroll */}
        <Reveal variant="up" delay={150} duration={600} className="mt-14 overflow-hidden rounded-3xl border border-khang-ink/10 bg-white">
          {/* Input bar */}
          <div className="border-b border-khang-ink/8 p-6 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-khang-ink/40">
                  ID
                </span>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="KH-2026-0042"
                  className="w-full rounded-full border border-khang-ink/10 bg-zinc-50 px-5 py-4 pl-12 font-mono text-sm tracking-wide text-khang-ink placeholder:text-zinc-400 focus:border-khang-ink focus:bg-white focus:outline-none"
                />
              </div>
              <button
                onClick={() => void track()}
                disabled={loading}
                className="rounded-full bg-khang-ink px-8 py-4 font-display text-[12px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-khang-red disabled:opacity-50"
              >
                {loading ? "Checking…" : "Track Order"}
              </button>
            </div>
            {error && (
              <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.15em] text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="p-6 sm:p-10">
            {!tracking ? (
              <div className="py-16 text-center">
                <div className="text-6xl opacity-60">🥡</div>
                <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-400">
                  Enter your order ID above to begin tracking
                </p>
              </div>
            ) : (
              <>
                {/* Status header */}
                <div className="flex items-center justify-between border-b border-khang-ink/8 pb-5">
                  <div>
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-khang-ink/50">
                      Order
                    </div>
                    <div className="mt-1 font-mono text-base font-semibold tracking-[0.1em] text-khang-ink">
                      #{(info?.order_number ?? orderId).toUpperCase()}
                    </div>
                    {info?.customer_name && (
                      <div className="mt-1 font-body text-[13px] text-zinc-500">
                        {info.customer_name} · ₹{info.total}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                      </span>
                      Live
                    </div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-khang-ink/40">
                      {eta(info)}
                    </div>
                  </div>
                </div>

                {/* Progress */}
                <div className="relative mt-10">
                  <div className="absolute left-0 right-0 top-7 h-px bg-khang-ink/10" />
                  <div
                    className="absolute left-0 top-7 h-px bg-khang-ink transition-all duration-700"
                    style={{
                      width: `${(stage / (STAGES.length - 1)) * 100}%`,
                    }}
                  />

                  <div className="grid grid-cols-4 gap-2">
                    {STAGES.map((s, i) => {
                      const done = i <= stage;
                      const current = i === stage;
                      return (
                        <div
                          key={s.label}
                          className="flex flex-col items-center text-center"
                        >
                          <div
                            className={`relative grid h-14 w-14 place-items-center rounded-full border transition-all duration-500 ${
                              done
                                ? "border-khang-ink bg-khang-ink text-white"
                                : "border-khang-ink/15 bg-white text-zinc-300"
                            }`}
                          >
                            {done && !current ? (
                              <CheckIcon className="h-5 w-5" />
                            ) : (
                              <span className="text-lg">{s.icon}</span>
                            )}
                            {current && (
                              <span className="pulse-ring absolute inset-0 rounded-full ring-2 ring-khang-ink/30" />
                            )}
                          </div>
                          <div
                            className={`mt-4 font-display text-xs font-semibold tracking-tight sm:text-[13px] ${
                              done ? "text-khang-ink" : "text-zinc-400"
                            }`}
                          >
                            {s.label}
                          </div>
                          <div className="hidden font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-400 sm:block">
                            {s.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Status card */}
                <div className="mt-10 flex items-center gap-4 rounded-2xl border border-khang-ink/10 bg-zinc-50 p-5">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-khang-ink text-white">
                    {stage < 2 ? (
                      <ChefIcon className="h-5 w-5" />
                    ) : (
                      <TruckIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[15px] font-semibold tracking-tight text-khang-ink">
                      {STAGES[stage].label}
                    </div>
                    <div className="mt-0.5 font-body text-[13px] font-light leading-relaxed text-zinc-500">
                      {info?.tracking?.length
                        ? (info.tracking[info.tracking.length - 1].note ?? STAGES[stage].desc)
                        : STAGES[stage].desc}{" "}
                      · {eta(info)}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
