import { useState } from "react";
import type { FoodItem } from "./data/menu";
import { CartProvider, useCart } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import FeaturedCarousel from "./components/FeaturedCarousel";
import MenuSection from "./components/MenuSection";
import ChefSurprise from "./components/ChefSurprise";
import OrderTracking from "./components/OrderTracking";
import Reviews from "./components/Reviews";
import PromoVideo from "./components/PromoVideo";
import TopFoods from "./components/TopFoods";
import Footer from "./components/Footer";
import FoodDetailModal from "./components/FoodDetailModal";
import CartDrawer from "./components/CartDrawer";
import CheckoutModal from "./components/CheckoutModal";
import SearchModal from "./components/SearchModal";
import AuthModal from "./components/AuthModal";
import AdminDashboard from "./components/AdminDashboard";
import ScrollProgressBar from "./components/ScrollProgressBar";
import IntroCinematic, {
  shouldSkipIntro,
  type IntroPhase,
} from "./components/IntroCinematic";
import { CartIcon } from "./components/Icons";

function FloatingCartButton() {
  const { count, openCart, total } = useCart();
  if (count === 0) return null;
  return (
    <button
      onClick={openCart}
      className="fixed bottom-5 right-5 z-30 flex items-center gap-3 rounded-full bg-khang-ink px-6 py-3.5 text-white shadow-[0_15px_40px_rgba(10,10,10,0.25)] transition hover:scale-105 hover:bg-khang-red animate-fade-up sm:hidden"
    >
      <CartIcon className="h-5 w-5" />
      <span className="font-mono text-sm font-semibold tracking-wider">
        {count} · ₹{total}
      </span>
    </button>
  );
}

function Shell() {
  const [activeItem, setActiveItem] = useState<FoodItem | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  return (
    <div className="min-h-screen bg-khang-bg">
      <ScrollProgressBar />
      <Navbar
        onSearch={() => setSearchOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      <main>
        <Hero />
        <FeaturedCarousel />
        <MenuSection onView={setActiveItem} />
        <PromoVideo />
        <TopFoods onView={setActiveItem} />
        <ChefSurprise onView={setActiveItem} />
        <OrderTracking />
        <Reviews />
      </main>

      <Footer />

      <FoodDetailModal item={activeItem} onClose={() => setActiveItem(null)} />
      <CartDrawer onCheckout={() => setCheckoutOpen(true)} />
      <CheckoutModal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} />
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} onPick={setActiveItem} />
      <AuthModal />
      <AdminDashboard open={adminOpen} onClose={() => setAdminOpen(false)} />
      <FloatingCartButton />
    </div>
  );
}

export default function App() {
  // Mirrors the intro's own decision so the page is never needlessly held back.
  const [introPhase, setIntroPhase] = useState<IntroPhase>(() =>
    shouldSkipIntro() ? "done" : "playing",
  );

  // While the curtain is up the site sits blurred and scaled up behind it.
  // The class is dropped entirely afterwards — a lingering `transform` would
  // become the containing block for the fixed navbar, cart button and modals.
  const stageClass =
    introPhase === "done"
      ? undefined
      : `intro-stage${introPhase === "exiting" ? " is-opening" : ""}`;

  return (
    <AuthProvider>
      <CartProvider>
        <div className={stageClass}>
          <Shell />
        </div>
        <IntroCinematic onPhaseChange={setIntroPhase} />
      </CartProvider>
    </AuthProvider>
  );
}
