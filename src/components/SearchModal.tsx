import { useEffect, useMemo, useState } from "react";
import { MENU, type FoodItem } from "../data/menu";
import { CloseIcon, SearchIcon, StarIcon } from "./Icons";

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (item: FoodItem) => void;
}

export default function SearchModal({ open, onClose, onPick }: Props) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (open) {
      setQ("");
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const results = useMemo(() => {
    if (!q.trim()) return MENU.slice(0, 6);
    const term = q.toLowerCase();
    return MENU.filter(
      (m) =>
        m.name.toLowerCase().includes(term) ||
        m.chineseName.includes(q) ||
        m.category.toLowerCase().includes(term) ||
        m.description.toLowerCase().includes(term),
    );
  }, [q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] animate-fade-in">
      <div
        className="absolute inset-0 bg-khang-ink/50 backdrop-blur-md"
        onClick={onClose}
      />
      <div className="relative mx-auto mt-24 max-w-2xl px-4">
        <div className="overflow-hidden rounded-3xl border border-khang-ink/10 bg-white shadow-2xl animate-scale-in">
          {/* Search input */}
          <div className="flex items-center gap-4 border-b border-khang-ink/8 px-6 py-5">
            <SearchIcon className="h-5 w-5 text-khang-ink/50" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search for dim sum, noodles, drinks…"
              className="flex-1 bg-transparent font-body text-base font-light tracking-wide text-khang-ink outline-none placeholder:text-zinc-400"
            />
            <kbd className="hidden rounded border border-khang-ink/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-khang-ink/50 sm:inline">
              ESC
            </kbd>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full border border-khang-ink/10 text-khang-ink/60 hover:border-khang-ink hover:text-khang-ink"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Section label */}
          <div className="border-b border-khang-ink/8 px-6 py-3">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-khang-ink/50">
              {q.trim() ? `${results.length} results` : "Popular dishes"}
            </span>
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto px-3 py-2">
            {results.length === 0 ? (
              <div className="py-16 text-center font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">
                No dishes matching "{q}"
              </div>
            ) : (
              <ul>
                {results.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => {
                        onPick(m);
                        onClose();
                      }}
                      className="flex w-full items-center gap-4 rounded-2xl p-3 text-left transition hover:bg-zinc-50"
                    >
                      <img
                        src={m.image}
                        alt={m.name}
                        className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-cn text-xs tracking-wider text-khang-red">
                          {m.chineseName}
                        </div>
                        <div className="mt-0.5 font-display text-sm font-medium tracking-tight">
                          {m.name}
                        </div>
                        <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">
                          {m.category}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-brush text-lg font-medium tracking-tight text-khang-ink">
                          ₹{m.price}
                        </div>
                        <div className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] font-semibold text-khang-ink/60">
                          <StarIcon className="h-3 w-3 text-khang-red" />
                          {m.rating}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
