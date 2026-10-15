import { useState } from "react";
import { ordersApi, isSupabaseConfigured, type KhangOrder } from "../lib/api";
import { CheckIcon, ChefIcon, TruckIcon } from "./Icons";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

const STAGES = [
  { key: "received", label: "Received", desc: "We got your order", icon: "📝" },
  { key: "preparing", label: "Preparing", desc: "Wok is sizzling", icon: "🔥" },
  { key: "out_for_delivery", label: "On the Way", desc: "Out for delivery", icon: "🚚" },
  { key: "delivered", label: "Delivered", desc: "Enjoy your meal", icon: "🥢" },
] as const;

const stageForStatus: Record<string, number> = {
  received: 0,
  preparing: 1,
  out_for_delivery: 2,
  delivered: 3,
  cancelled: 0,
};

function etaLabel(estimatedDelivery?: string) {
  if (!estimatedDelivery) return "ETA unavailable";
  const eta = new Date(estimatedDelivery);
  if (Number.isNaN(eta.getTime())) return "ETA unavailable";
  return `ETA · ${eta.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

export default function OrderTracking() {
  const [orderId, setOrderId] = useState("");
  const [tracking, setTracking] = useState(false);
  const [stage, setStage] = useState(0);
  const [order, setOrder] = useState<Partial<KhangOrder> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const track = async () => {
    const requestedId = orderId.trim();
    if (!requestedId) return;
    setError(null);
    setOrder(null);

    if (!isSupabaseConfigured) {
      // Keep the design preview animated until public Supabase values are added.
      setTracking(true);
      setStage(0);
      for (let index = 1; index <= 3; index += 1) {
        window.setTimeout(() => setStage(index), index * 1500);
      }
      return;
    }

    setLoading(true);
    try {
      const { order: trackedOrder } = await ordersApi.track(requestedId.toUpperCase());
      const currentStage = stageForStatus[trackedOrder.status || "received"] ?? 0;
      setOrder(trackedOrder);
      setStage(currentStage);
      setTracking(true);
    } catch (err) {
      setTracking(false);
      setError(err instanceof Error ? err.message : "Unable to find that order");
    } finally {
      setLoading(false);
    }
  };

  const isCancelled = order?.status === "cancelled";
  const activeStage = STAGES[stage];
  const visibleOrderId = order?.orderId || orderId.trim().toUpperCase();
  const statusLabel = isCancelled ? "Cancelled" : activeStage.label;
  const statusDescription = isCancelled
    ? "This order has been cancelled. Please contact the restaurant if you need help."
    : activeStage.desc;

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

        <Reveal variant="up" delay={150} duration={600} className="mt-14 overflow-hidden rounded-3xl border border-khang-ink/10 bg-white">
          <div className="border-b border-khang-ink/8 p-6 sm:p-8">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-khang-ink/40">
                  ID
                </span>
                <input
                  type="text"
                  value={orderId}
                  onChange={(event) => setOrderId(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void track();
                  }}
                  placeholder="KH-2026-001000"
                  className="w-full rounded-full border border-khang-ink/10 bg-zinc-50 px-5 py-4 pl-12 font-mono text-sm tracking-wide text-khang-ink placeholder:text-zinc-400 focus:border-khang-ink focus:bg-white focus:outline-none"
                />
              </div>
              <button
                onClick={() => void track()}
                disabled={loading}
                className="rounded-full bg-khang-ink px-8 py-4 font-display text-[12px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-khang-red disabled:cursor-wait disabled:opacity-60"
              >
                {loading ? "Checking…" : "Track Order"}
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 font-mono text-xs text-red-700">
                {error}
              </div>
            )}

            {!tracking ? (
              <div className="py-16 text-center">
                <div className="text-6xl opacity-60">🥡</div>
                <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-400">
                  Enter your order ID above to begin tracking
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-khang-ink/8 pb-5">
                  <div>
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-khang-ink/50">
                      Order
                    </div>
                    <div className="mt-1 font-mono text-base font-semibold tracking-[0.1em] text-khang-ink">
                      #{visibleOrderId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] ${
                        isCancelled ? "text-khang-red" : "text-emerald-600"
                      }`}
                    >
                      <span className="relative flex h-2 w-2">
                        {!isCancelled && (
                          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-75" />
                        )}
                        <span
                          className={`relative inline-flex h-2 w-2 rounded-full ${
                            isCancelled ? "bg-khang-red" : "bg-emerald-500"
                          }`}
                        />
                      </span>
                      {isCancelled ? "Cancelled" : "Live"}
                    </div>
                    <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-khang-ink/40">
                      {etaLabel(order?.estimatedDelivery)}
                    </div>
                  </div>
                </div>

                <div className="relative mt-10">
                  <div className="absolute left-0 right-0 top-7 h-px bg-khang-ink/10" />
                  <div
                    className="absolute left-0 top-7 h-px bg-khang-ink transition-all duration-700"
                    style={{ width: `${(stage / (STAGES.length - 1)) * 100}%` }}
                  />

                  <div className="grid grid-cols-4 gap-2">
                    {STAGES.map((item, index) => {
                      const done = !isCancelled && index <= stage;
                      const current = !isCancelled && index === stage;
                      return (
                        <div key={item.key} className="flex flex-col items-center text-center">
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
                              <span className="text-lg">{item.icon}</span>
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
                            {item.label}
                          </div>
                          <div className="hidden font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-400 sm:block">
                            {item.desc}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-10 flex items-center gap-4 rounded-2xl border border-khang-ink/10 bg-zinc-50 p-5">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-khang-ink text-white">
                    {stage < 2 ? <ChefIcon className="h-5 w-5" /> : <TruckIcon className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-[15px] font-semibold tracking-tight text-khang-ink">
                      {statusLabel}
                    </div>
                    <div className="mt-0.5 font-body text-[13px] font-light leading-relaxed text-zinc-500">
                      {statusDescription}
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
