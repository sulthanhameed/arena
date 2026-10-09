import { useCallback, useState } from "react";
import type { FoodItem } from "./data/menu";
import { CartProvider, useCart } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { MenuProvider } from "./context/MenuContext";
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
import { CartIcon } from "./components/Icons";
import IntroEntrance, {
  shouldSkipIntro,
  type IntroPhase,
} from "./components/IntroEntrance";

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
  /* The entrance sits over the site rather than instead of it: the
     page mounts and loads underneath while the lockup assembles, so
     by the time the ink clears the menu is already there. The two
     classes hold it back (blurred, a shade large) and release it. */
  const [introPhase, setIntroPhase] = useState<IntroPhase>(() =>
    shouldSkipIntro() ? "done" : "playing",
  );
  const onPhaseChange = useCallback((p: IntroPhase) => setIntroPhase(p), []);

  const held = introPhase === "playing";
  const releasing = introPhase === "exiting";

  return (
    <AuthProvider>
      <MenuProvider>
        <CartProvider>
          <div
            className={
              held ? "site-behind-intro" : releasing ? "site-released" : undefined
            }
          >
            <Shell />
          </div>
          <IntroEntrance onPhaseChange={onPhaseChange} />
        </CartProvider>
      </MenuProvider>
    </AuthProvider>
  );
}
