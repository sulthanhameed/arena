import { useEffect, useState } from "react";
import type { FoodItem } from "../data/menu";
import { useCart } from "../context/CartContext";
import { CloseIcon, FlameIcon, MinusIcon, PlusIcon, StarIcon } from "./Icons";

interface Props {
  item: FoodItem | null;
  onClose: () => void;
}

export default function FoodDetailModal({ item, onClose }: Props) {
  const { add, openCart } = useCart();
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setQty(1);
    if (item) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [item]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      <div
        className="absolute inset-0 bg-khang-ink/60 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative flex h-full items-center justify-center p-4">
        <div className="relative w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl animate-scale-in max-h-[92vh] overflow-y-auto">
          <button
            onClick={onClose}
            className="absolute right-5 top-5 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/95 text-khang-ink shadow-lg backdrop-blur transition hover:scale-110"
          >
            <CloseIcon />
          </button>

          <div className="grid md:grid-cols-2">
            {/* Image */}
            <div className="relative aspect-square md:aspect-auto md:h-full md:min-h-[560px] bg-zinc-50">
              <img
                src={item.image}
                alt={item.name}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-khang-ink/30 via-transparent to-transparent" />
              <div className="absolute bottom-7 left-7 font-cn text-6xl tracking-wider text-white drop-shadow-2xl">
                {item.chineseName}
              </div>
              <div className="absolute left-7 top-7 flex items-center gap-2">
                <span
                  className={`grid h-5 w-5 place-items-center rounded-sm border-2 bg-white ${
                    item.veg ? "border-emerald-600" : "border-red-600"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      item.veg ? "bg-emerald-600" : "bg-red-600"
                    }`}
                  />
                </span>
                {item.spicy && item.spicy > 0 && (
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-white/95 px-2.5 py-1 text-khang-red backdrop-blur">
                    {[...Array(item.spicy)].map((_, i) => (
                      <FlameIcon key={i} className="h-3 w-3" />
                    ))}
                  </span>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="flex flex-col p-8 sm:p-12">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-khang-ink/50">
                  {item.category}
                </span>
                <span className="h-px w-8 bg-khang-ink/20" />
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-khang-ink/40">
                  ⏱ {item.prepTime}
                </span>
              </div>

              <h2 className="mt-4 font-brush text-[2rem] font-medium leading-[1.1] tracking-[-0.02em] text-khang-ink sm:text-[2.75rem]">
                {item.name}
              </h2>

              <div className="mt-5 flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i}
                      className={`h-3.5 w-3.5 ${i < Math.round(item.rating) ? "text-khang-red" : "text-zinc-200"}`}
                    />
                  ))}
                </div>
                <span className="font-mono text-sm font-semibold text-khang-ink">
                  {item.rating}
                </span>
                <span className="font-mono text-xs text-khang-ink/40">
                  ({item.reviews} reviews)
                </span>
              </div>

              <p className="mt-6 font-body text-[15px] font-light leading-[1.85] tracking-wide text-zinc-600">
                {item.description}
              </p>

              {/* Ingredients */}
              <div className="mt-8">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-khang-ink/50">
                  Ingredients
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.ingredients.map((ing) => (
                    <span
                      key={ing}
                      className="rounded-full border border-khang-ink/10 bg-white px-3.5 py-1.5 font-body text-xs font-medium tracking-wide text-khang-ink"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              {/* Reviews preview */}
              <div className="mt-8 border-t border-khang-ink/8 pt-6">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-khang-ink/50">
                  What people say
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { name: "Priya S.", text: "Best I've had in the city. Absolutely authentic!" },
                    { name: "Karan M.", text: "The texture is perfect, hot & flavourful." },
                  ].map((r) => (
                    <div key={r.name} className="flex gap-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-khang-ink font-display text-xs font-semibold text-white">
                        {r.name[0]}
                      </div>
                      <div>
                        <div className="font-display text-xs font-semibold tracking-tight">
                          {r.name}
                        </div>
                        <p className="mt-0.5 font-brush text-sm italic font-normal leading-relaxed text-zinc-600">
                          "{r.text}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price + qty + actions */}
              <div className="mt-auto pt-8">
                <div className="flex items-end justify-between border-t border-khang-ink/8 pt-6">
                  <div>
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-khang-ink/50">
                      Total
                    </div>
                    <div className="mt-1 font-brush text-[2.5rem] font-medium tracking-tight text-khang-ink leading-none">
                      ₹{item.price * qty}
                    </div>
                  </div>
                  <div className="flex items-center rounded-full border border-khang-ink/15">
                    <button
                      onClick={() => setQty(Math.max(1, qty - 1))}
                      className="grid h-10 w-10 place-items-center text-khang-ink/60 hover:text-khang-red"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-mono font-semibold text-khang-ink">
                      {qty}
                    </span>
                    <button
                      onClick={() => setQty(qty + 1)}
                      className="grid h-10 w-10 place-items-center text-khang-ink/60 hover:text-khang-red"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      add(item, qty);
                      onClose();
                    }}
                    className="rounded-full border border-khang-ink bg-white py-3.5 font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-khang-ink transition hover:bg-khang-ink hover:text-white"
                  >
                    Add to Cart
                  </button>
                  <button
                    onClick={() => {
                      add(item, qty);
                      onClose();
                      openCart();
                    }}
                    className="rounded-full bg-khang-ink py-3.5 font-display text-[12px] font-semibold uppercase tracking-[0.18em] text-white transition hover:bg-khang-red"
                  >
                    Order Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
