import { useEffect, useState } from "react";
import { CartIcon, MenuIcon, SearchIcon, CloseIcon } from "./Icons";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import UserMenu from "./UserMenu";

const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Menu", href: "#menu" },
  { label: "About", href: "#about" },
  { label: "Services", href: "#services" },
  { label: "Contact", href: "#contact" },
];

interface Props {
  onSearch: () => void;
  onOpenAdmin?: () => void;
}

export default function Navbar({ onSearch, onOpenAdmin }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("home");
  const { count, openCart } = useCart();
  const { user, openAuth, logout } = useAuth();

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30);

      // Detect active section based on scroll position
      const sections = NAV_LINKS.map((l) => l.href.replace("#", ""));
      const offset = 120;
      let current = "home";
      for (const id of sections) {
        const el = document.getElementById(id);
        if (el) {
          const top = el.getBoundingClientRect().top;
          if (top - offset <= 0) current = id;
        }
      }
      setActiveSection(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    e.preventDefault();
    setMobileOpen(false);
    const id = href.replace("#", "");
    if (id === "home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl shadow-[0_4px_24px_rgba(6,78,46,0.08)] border-b border-emerald-200/60"
            : "bg-white/40 backdrop-blur-md border-b border-white/40"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo */}
          <a
            href="#home"
            onClick={(e) => handleNavClick(e, "#home")}
            className="group flex items-center gap-3.5"
          >
            <div className="relative grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-khang-red to-khang-red-dark shadow-lg shadow-green-900/30 ring-2 ring-white">
              <span className="font-cn text-2xl text-white leading-none">康</span>
            </div>
            <div className="hidden sm:block">
              <div className="font-brush text-[1.6rem] font-semibold leading-none tracking-tight text-khang-red">
                Khang
              </div>
              <div className="mt-1 font-mono text-[10px] font-medium uppercase tracking-[0.3em] text-black/60">
                Chinese · Dimsum
              </div>
            </div>
          </a>

          {/* Desktop nav — ALWAYS VISIBLE */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((l) => {
              const id = l.href.replace("#", "");
              const isActive = activeSection === id;
              return (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={(e) => handleNavClick(e, l.href)}
                  className={`group relative rounded-full px-5 py-2 font-display text-[0.82rem] font-medium tracking-[0.12em] uppercase transition-all duration-300 ${
                    isActive
                      ? "text-khang-red"
                      : "text-khang-ink/75 hover:text-khang-red"
                  }`}
                >
                  {l.label}
                  {/* Active underline */}
                  <span
                    className={`absolute inset-x-5 -bottom-0.5 h-px origin-center bg-gradient-to-r from-transparent via-khang-red to-transparent transition-transform duration-300 ${
                      isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                  {/* Active dot indicator */}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-khang-red" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <button
              aria-label="Search"
              onClick={onSearch}
              className="grid h-10 w-10 place-items-center rounded-full text-khang-ink transition hover:bg-khang-red/10 hover:text-khang-red"
            >
              <SearchIcon />
            </button>
            <button
              aria-label="Cart"
              onClick={openCart}
              className="relative grid h-10 w-10 place-items-center rounded-full text-khang-ink transition hover:bg-khang-red/10 hover:text-khang-red"
            >
              <CartIcon />
              {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-khang-red px-1 font-mono text-[10px] font-bold text-white ring-2 ring-white">
                  {count}
                </span>
              )}
            </button>
            <UserMenu onOpenAdmin={onOpenAdmin} />
            <button
              aria-label="Open menu"
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-full text-khang-ink transition hover:bg-khang-red/10 hover:text-khang-red md:hidden"
            >
              <MenuIcon />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-72 bg-white animate-slide-in-right shadow-2xl">
            <div className="flex items-center justify-between border-b border-khang-red/15 p-5">
              <div className="flex items-baseline gap-2">
                <span className="font-cn text-2xl text-khang-red">康</span>
                <span className="font-brush text-xl font-semibold tracking-tight text-khang-red">
                  Khang
                </span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-khang-red/10 text-khang-red"
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="flex flex-col px-5 py-4">
              {NAV_LINKS.map((l) => {
                const id = l.href.replace("#", "");
                const isActive = activeSection === id;
                return (
                  <a
                    key={l.href}
                    href={l.href}
                    onClick={(e) => handleNavClick(e, l.href)}
                    className={`flex items-center justify-between border-b border-khang-red/10 py-4 font-display text-sm font-medium uppercase tracking-[0.18em] transition ${
                      isActive
                        ? "text-khang-red"
                        : "text-khang-ink hover:text-khang-red"
                    }`}
                  >
                    {l.label}
                    {isActive && (
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    )}
                  </a>
                );
              })}
            </nav>
            <div className="absolute inset-x-0 bottom-0 space-y-3 border-t border-khang-ink/10 bg-white p-5">
              {user ? (
                <>
                  <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-3">
                    <div className="grid h-10 w-10 place-items-center rounded-full bg-khang-ink font-display text-sm font-semibold text-white">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-[13px] font-semibold tracking-tight text-khang-ink truncate">
                        {user.name}
                      </div>
                      <div className="font-mono text-[10px] text-khang-ink/50 truncate">
                        {user.email}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="w-full rounded-full border border-khang-ink/15 py-3 font-display text-[12px] font-semibold uppercase tracking-[0.2em] text-khang-ink transition hover:border-khang-red hover:bg-khang-red hover:text-white"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      openAuth("login");
                      setMobileOpen(false);
                    }}
                    className="w-full rounded-full bg-khang-ink py-3 font-display text-[12px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-khang-red"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => {
                      openAuth("signup");
                      setMobileOpen(false);
                    }}
                    className="w-full rounded-full border border-khang-ink/15 bg-white py-3 font-display text-[12px] font-semibold uppercase tracking-[0.2em] text-khang-ink transition hover:border-khang-ink"
                  >
                    Create Account
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
