import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { CATEGORIES, MENU, type Category, type FoodItem } from "../data/menu";
import { isSupabaseConfigured, productsApi, type KhangProduct } from "../lib/api";

interface MenuContextValue {
  menu: FoodItem[];
  categories: typeof CATEGORIES;
}

const MenuContext = createContext<MenuContextValue | null>(null);

function isCategory(value: string): value is Category {
  return CATEGORIES.some((category) => category.name === value);
}

function toFoodItem(product: KhangProduct): FoodItem | null {
  // The seeded categories correspond to the storefront's category design.
  // Skip an unexpected category rather than rendering a broken filter state.
  if (!isCategory(product.category)) return null;
  return {
    id: product._id,
    name: product.name,
    chineseName: product.chineseName,
    category: product.category,
    price: product.price,
    rating: product.rating,
    reviews: product.reviewsCount,
    description: product.description,
    ingredients: product.ingredients,
    image: product.image,
    spicy: product.spicy,
    veg: product.veg,
    featured: product.featured,
    prepTime: product.prepTime,
  };
}

/**
 * Starts with the curated local menu for an instant render, then replaces it
 * with the Postgres menu when the Supabase project is configured and available.
 */
export function MenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<FoodItem[]>(MENU);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let active = true;

    void productsApi
      .list({ sort: "popular" })
      .then(({ items }) => {
        const remoteMenu = items
          .map(toFoodItem)
          .filter((item): item is FoodItem => item !== null);
        if (active && remoteMenu.length) setMenu(remoteMenu);
      })
      .catch(() => {
        // The static seed-shaped menu is intentionally retained when an Edge
        // Function is being deployed or the visitor is temporarily offline.
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<MenuContextValue>(
    () => ({ menu, categories: CATEGORIES }),
    [menu],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (!context) throw new Error("useMenu must be used within MenuProvider");
  return context;
}
