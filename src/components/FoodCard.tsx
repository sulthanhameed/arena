import { useState } from "react";
import type { FoodItem } from "../data/menu";
import { useCart } from "../context/CartContext";
import { FlameIcon, MinusIcon, PlusIcon, StarIcon } from "./Icons";
import ParallaxImage from "./ParallaxImage";

interface Props {
  item: FoodItem;
  onView: (item: FoodItem) => void;
}

export default function FoodCard({ item, onView }: Props) {
  const { add, lastAddedId } = useCart();
  const [qty, setQty] = useState(1);
  const justAdded = lastAddedId === item.id;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-khang-ink/8 bg-white transition-all duration-500 hover:-translate-y-1 hover:border-khang-ink/20 hover:shadow-[0_24px_60px_-15px_rgba(10,10,10,0.15)]">
      {/* Image — drifts vertically inside the frame as you scroll */}
      <button
        onClick={() => onView(item)}
        className="relative aspect-[5/4] w-full overflow-hidden bg-zinc-50"
      >
        <ParallaxImage
          src={item.image}
          alt={item.name}
          className="absolute inset-0 h-full w-full transition-transform duration-700 group-hover:scale-105"
          speed={140}
          zoom={1.35}
        />

        {/* Top row: veg dot + spice */}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          {/* Veg indicator - minimal square */}
          <span
            className={`grid h-4 w-4 place-items-center rounded-sm border-[1.5px] bg-white ${
              item.veg ? "border-emerald-600" : "border-red-600"
            }`}
            title={item.veg ? "Veg" : "Non-veg"}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                item.veg ? "bg-emerald-600" : "bg-red-600"
              }`}
            />
          </span>
          {item.spicy && item.spicy > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/95 px-2 py-0.5 text-khang-red shadow-sm backdrop-blur">
              {[...Array(item.spicy)].map((_, i) => (
                <FlameIcon key={i} className="h-2.5 w-2.5" />
              ))}
            </span>
          )}
        </div>

        {/* Top right: rating */}
        <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 font-mono text-[11px] font-semibold text-khang-ink shadow-sm backdrop-blur">
          <StarIcon className="h-3 w-3 text-khang-red" />
          {item.rating}
        </div>
      </button>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Chinese + category line */}
        <div className="flex items-center justify-between">
          <span className="font-cn text-sm tracking-wider text-khang-red">
            {item.chineseName}
          </span>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-khang-ink/40">
            {item.category}
          </span>
        </div>

        {/* Name */}
        <h3 className="mt-2 font-display text-[1.05rem] font-medium leading-snug tracking-tight text-khang-ink">
          {item.name}
        </h3>

        {/* Description */}
        <p className="mt-2.5 line-clamp-2 font-body text-[13px] font-light leading-relaxed text-zinc-500">
          {item.description}
        </p>

        {/* Meta row */}
        <div className="mt-4 flex items-center justify-between border-t border-khang-ink/8 pt-3 font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-khang-ink/40">
          <span>⏱ {item.prepTime}</span>
          <span>{item.reviews} reviews</span>
        </div>

        {/* Price + actions */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="font-brush text-2xl font-medium tracking-tight text-khang-ink">
            ₹{item.price}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-full border border-khang-ink/15">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="grid h-7 w-7 place-items-center text-khang-ink/60 transition hover:text-khang-red"
                aria-label="Decrease"
              >
                <MinusIcon className="h-3 w-3" />
              </button>
              <span className="w-5 text-center font-mono text-[11px] font-semibold text-khang-ink">
                {qty}
              </span>
              <button
                onClick={() => setQty(qty + 1)}
                className="grid h-7 w-7 place-items-center text-khang-ink/60 transition hover:text-khang-red"
                aria-label="Increase"
              >
                <PlusIcon className="h-3 w-3" />
              </button>
            </div>
            <button
              onClick={() => add(item, qty)}
              className={`rounded-full px-4 py-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] transition ${
                justAdded
                  ? "bg-emerald-600 text-white"
                  : "bg-khang-ink text-white hover:bg-khang-red"
              }`}
            >
              {justAdded ? "✓ Added" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
