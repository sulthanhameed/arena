import { useCart } from "../context/CartContext";
import { CloseIcon, MinusIcon, PlusIcon } from "./Icons";

interface Props {
  onCheckout: () => void;
}

export default function CartDrawer({ onCheckout }: Props) {
  const { isOpen, closeCart, lines, update, remove, subtotal, tax, delivery, total, count } =
    useCart();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-khang-ink/40 backdrop-blur-sm animate-fade-in"
        onClick={closeCart}
      />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-khang-ink/8 px-7 py-6">
          <div>
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-khang-ink/50">
              Your Cart
            </div>
            <div className="mt-2 flex items-baseline gap-3">
              <span className="font-brush text-3xl font-medium tracking-tight text-khang-ink leading-none">
                {count}
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.2em] text-khang-ink/50">
                {count === 1 ? "item" : "items"}
              </span>
            </div>
          </div>
          <button
            onClick={closeCart}
            className="grid h-10 w-10 place-items-center rounded-full border border-khang-ink/15 text-khang-ink transition hover:border-khang-ink hover:bg-khang-ink hover:text-white"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto px-7 py-5">
          {lines.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="text-6xl opacity-50">🥡</div>
              <div className="mt-6 font-brush text-2xl font-medium tracking-tight text-khang-ink">
                Your cart is empty
              </div>
              <div className="mt-2 max-w-[240px] font-body text-sm font-light leading-relaxed text-zinc-500">
                Add some delicious dishes from the menu to get started.
              </div>
              <button
                onClick={closeCart}
                className="mt-8 rounded-full bg-khang-ink px-8 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-khang-red"
              >
                Browse Menu
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-khang-ink/8">
              {lines.map((l) => (
                <li
                  key={l.item.id}
                  className="flex gap-4 py-5 animate-fade-up"
                >
                  <img
                    src={l.item.image}
                    alt={l.item.name}
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-cn text-xs tracking-wider text-khang-red">
                          {l.item.chineseName}
                        </div>
                        <div className="mt-0.5 font-display text-sm font-medium tracking-tight">
                          {l.item.name}
                        </div>
                      </div>
                      <button
                        onClick={() => remove(l.item.id)}
                        className="font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-zinc-400 hover:text-khang-red"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-khang-ink/15">
                        <button
                          onClick={() => update(l.item.id, l.qty - 1)}
                          className="grid h-7 w-7 place-items-center text-khang-ink/60 hover:text-khang-red"
                        >
                          <MinusIcon className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center font-mono text-sm font-semibold text-khang-ink">
                          {l.qty}
                        </span>
                        <button
                          onClick={() => update(l.item.id, l.qty + 1)}
                          className="grid h-7 w-7 place-items-center text-khang-ink/60 hover:text-khang-red"
                        >
                          <PlusIcon className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="font-brush text-lg font-medium tracking-tight text-khang-ink">
                        ₹{l.item.price * l.qty}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {lines.length > 0 && (
          <div className="border-t border-khang-ink/8 px-7 py-6">
            <div className="space-y-3 font-mono text-[13px]">
              <Row label="Subtotal" value={subtotal} />
              <Row label="Tax (5%)" value={tax} />
              <Row
                label={delivery === 0 ? "Delivery (Free)" : "Delivery"}
                value={delivery}
                highlight={delivery === 0}
              />
              <div className="my-3 h-px bg-khang-ink/10" />
              <div className="flex items-center justify-between">
                <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-khang-ink">
                  Total
                </span>
                <span className="font-brush text-3xl font-medium tracking-tight text-khang-ink leading-none">
                  ₹{total}
                </span>
              </div>
            </div>
            <button
              onClick={onCheckout}
              className="mt-6 w-full rounded-full bg-khang-ink py-4 font-display text-[12px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-khang-red"
            >
              Checkout · ₹{total}
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-zinc-500">{label}</span>
      <span
        className={`font-semibold tracking-wide ${highlight ? "text-emerald-600" : "text-khang-ink"}`}
      >
        ₹{value}
      </span>
    </div>
  );
}
