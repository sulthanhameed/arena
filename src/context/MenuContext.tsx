/**
 * The menu, loaded from Supabase.
 *
 * Every storefront component used to import the hardcoded array in
 * `src/data/menu.ts` directly, which meant the database existed but nothing
 * on the page ever read from it. This provider is the single place the menu
 * comes from now:
 *
 *   Supabase configured  →  products + categories over PostgREST (RLS: the
 *                           menu is the one thing anon may read)
 *   not configured / down →  the static array, so the UI still demos
 *
 * `src/data/menu.ts` is therefore a *fallback*, not the source of truth. The
 * seed keeps `products.code` in parity with its ids so the two agree.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  CATEGORIES as STATIC_CATEGORIES,
  MENU as STATIC_MENU,
  type Category,
  type FoodItem,
} from "../data/menu";
import { productsApi, toFoodItem } from "../lib/api";
import { isSupabaseConfigured } from "../lib/supabase";

export type MenuSource = "supabase" | "offline";

/**
 * How long to wait for Supabase before showing the bundled menu instead.
 * A dead or misconfigured project otherwise leaves the page on a spinner
 * for as long as the browser's own connect timeout — which measured ~14s.
 */
const LOAD_TIMEOUT_MS = 8000;

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Supabase did not respond within ${ms / 1000}s`)),
      ms,
    );
    work.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

export interface CategoryChip {
  name: Category;
  icon: string;
  color: string;
}

interface MenuValue {
  menu: FoodItem[];
  categories: CategoryChip[];
  /** True while the first load is in flight. */
  loading: boolean;
  /** Set when Supabase was configured but the fetch failed. */
  error: string | null;
  /** Where the data on screen actually came from. */
  source: MenuSource;
  reload: () => void;
}

const MenuContext = createContext<MenuValue | null>(null);

/** Keep the gradient the design uses; take the emoji from the database. */
function toChip(name: string, icon: string | null): CategoryChip {
  const styled = STATIC_CATEGORIES.find((c) => c.name === name);
  return {
    name: name as Category,
    icon: icon ?? styled?.icon ?? "🍽️",
    color: styled?.color ?? "from-emerald-400 to-green-700",
  };
}

export function MenuProvider({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState<FoodItem[]>(STATIC_MENU);
  const [categories, setCategories] = useState<CategoryChip[]>(STATIC_CATEGORIES);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<MenuSource>("offline");
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setMenu(STATIC_MENU);
      setCategories(STATIC_CATEGORIES);
      setSource("offline");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [products, cats] = await withTimeout(
          Promise.all([
            productsApi.list({ sort: "popular" }),
            // A missing categories row should not sink the whole menu.
            productsApi.categories().catch(() => null),
          ]),
          LOAD_TIMEOUT_MS,
        );
        if (cancelled) return;

        const items = products.map(toFoodItem);
        if (items.length === 0) {
          throw new Error(
            "Supabase returned no dishes — run `npm run db:seed` to load the menu.",
          );
        }

        setMenu(items);
        if (Array.isArray(cats) && cats.length > 0) {
          setCategories(
            (cats as { name: string; icon: string | null }[]).map((c) =>
              toChip(c.name, c.icon),
            ),
          );
        }
        setSource("supabase");
      } catch (err) {
        if (cancelled) return;
        // Degrade to the bundled menu rather than showing an empty restaurant.
        setMenu(STATIC_MENU);
        setCategories(STATIC_CATEGORIES);
        setSource("offline");
        setError(err instanceof Error ? err.message : "Could not load the menu");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const value = useMemo<MenuValue>(
    () => ({ menu, categories, loading, error, source, reload }),
    [menu, categories, loading, error, source, reload],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu(): MenuValue {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used inside <MenuProvider>");
  return ctx;
}
