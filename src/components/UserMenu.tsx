import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { UserIcon } from "./Icons";

interface UserMenuProps {
  onOpenAdmin?: () => void;
}

export default function UserMenu({ onOpenAdmin }: UserMenuProps = {}) {
  const { user, openAuth, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const initial = user?.name.charAt(0).toUpperCase() || "";

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        aria-label={user ? "Account" : "Sign in"}
        onClick={() => setOpen((v) => !v)}
        className={`grid h-10 w-10 place-items-center rounded-full transition ${
          user
            ? "bg-khang-ink text-white hover:bg-khang-red"
            : "text-khang-ink hover:bg-khang-red/10 hover:text-khang-red"
        }`}
      >
        {user ? (
          <span className="font-display text-sm font-semibold">{initial}</span>
        ) : (
          <UserIcon />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-3 w-72 origin-top-right overflow-hidden rounded-2xl border border-khang-ink/10 bg-white shadow-[0_24px_60px_-15px_rgba(10,10,10,0.2)] animate-scale-in">
          {user ? (
            <>
              {/* Profile header */}
              <div className="border-b border-khang-ink/8 px-5 py-5">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-khang-ink font-display text-lg font-semibold text-white">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-[15px] font-semibold tracking-tight text-khang-ink truncate">
                      {user.name}
                    </div>
                    <div className="font-mono text-[11px] text-khang-ink/50 truncate">
                      {user.email}
                    </div>
                  </div>
                </div>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  ✓ Member · 10% off
                </div>
              </div>

              {/* Menu items */}
              <nav className="py-2">
                {user.role === "admin" && (
                  <button
                    onClick={() => {
                      onOpenAdmin?.();
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-3 border-b border-khang-ink/8 px-5 py-3 font-display text-[13px] font-semibold tracking-tight text-emerald-700 transition hover:bg-emerald-50"
                  >
                    <span className="text-base">⚡</span>
                    Admin Dashboard
                  </button>
                )}
                {[
                  { label: "My Profile", icon: "👤" },
                  { label: "My Orders", icon: "📦" },
                  { label: "Favourites", icon: "❤" },
                  { label: "Addresses", icon: "📍" },
                  { label: "Settings", icon: "⚙" },
                ].map((m) => (
                  <button
                    key={m.label}
                    onClick={() => setOpen(false)}
                    className="flex w-full items-center gap-3 px-5 py-2.5 font-display text-[13px] font-medium tracking-tight text-khang-ink/80 transition hover:bg-zinc-50 hover:text-khang-red"
                  >
                    <span className="text-base">{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </nav>

              <div className="border-t border-khang-ink/8 p-3">
                <button
                  onClick={() => {
                    logout();
                    setOpen(false);
                  }}
                  className="w-full rounded-full border border-khang-ink/15 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-khang-ink transition hover:border-khang-red hover:bg-khang-red hover:text-white"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Logged-out header */}
              <div className="border-b border-khang-ink/8 px-5 py-6">
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-khang-ink/50">
                  Welcome
                </div>
                <div className="mt-2 font-brush text-2xl font-medium tracking-tight text-khang-ink leading-tight">
                  Sign in to{" "}
                  <span className="italic font-light text-khang-red">Khang</span>
                </div>
                <p className="mt-2 font-body text-[12px] font-light leading-relaxed text-khang-ink/60">
                  Order faster, track meals & save 10% on every order as a member.
                </p>
              </div>

              <div className="space-y-2 p-4">
                <button
                  onClick={() => {
                    openAuth("login");
                    setOpen(false);
                  }}
                  className="w-full rounded-full bg-khang-ink py-3 font-display text-[12px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-khang-red"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    openAuth("signup");
                    setOpen(false);
                  }}
                  className="w-full rounded-full border border-khang-ink/15 bg-white py-3 font-display text-[12px] font-semibold uppercase tracking-[0.2em] text-khang-ink transition hover:border-khang-ink hover:bg-zinc-50"
                >
                  Create Account
                </button>
              </div>

              {/* Perks list */}
              <div className="border-t border-khang-ink/8 bg-zinc-50 px-5 py-4">
                <ul className="space-y-1.5 font-mono text-[10px] tracking-wide text-khang-ink/60">
                  <li>✓ Free delivery on first order</li>
                  <li>✓ Exclusive chef's specials</li>
                  <li>✓ Order history & re-order in 1 tap</li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
