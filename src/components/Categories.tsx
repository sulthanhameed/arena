import { CATEGORIES, type Category } from "../data/menu";

interface Props {
  active: Category | "All";
  onSelect: (c: Category | "All") => void;
}

export default function Categories({ active, onSelect }: Props) {
  const all: ({ name: Category | "All"; icon: string })[] = [
    { name: "All", icon: "✦" },
    ...CATEGORIES.map((c) => ({ name: c.name, icon: c.icon })),
  ];

  return (
    <div className="border-y border-khang-ink/8 bg-white py-5">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="mr-4 hidden shrink-0 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-khang-ink/50 sm:inline">
            Browse by
          </span>
          {all.map((cat) => {
            const isActive = active === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => onSelect(cat.name)}
                className={`group inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 font-display text-[12px] font-medium tracking-wide transition-all duration-300 ${
                  isActive
                    ? "border-khang-ink bg-khang-ink text-white"
                    : "border-khang-ink/15 bg-white text-khang-ink/80 hover:border-khang-ink hover:text-khang-ink"
                }`}
              >
                <span
                  className={`text-base ${isActive ? "" : "opacity-70 group-hover:opacity-100"}`}
                >
                  {cat.icon}
                </span>
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
