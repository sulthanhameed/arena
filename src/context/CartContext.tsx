import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { FoodItem } from "../data/menu";

export interface CartLine {
  item: FoodItem;
  qty: number;
}

interface CartContextValue {
  lines: CartLine[];
  add: (item: FoodItem, qty?: number) => void;
  remove: (id: string) => void;
  update: (id: string, qty: number) => void;
  clear: () => void;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  count: number;
  subtotal: number;
  tax: number;
  delivery: number;
  total: number;
  lastAddedId: string | null;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const add = useCallback((item: FoodItem, qty = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.item.id === item.id);
      if (existing) {
        return prev.map((l) =>
          l.item.id === item.id ? { ...l, qty: l.qty + qty } : l
        );
      }
      return [...prev, { item, qty }];
    });
    setLastAddedId(item.id);
    setTimeout(() => setLastAddedId(null), 900);
  }, []);

  const remove = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.item.id !== id));
  }, []);

  const update = useCallback((id: string, qty: number) => {
    setLines((prev) =>
      qty <= 0
        ? prev.filter((l) => l.item.id !== id)
        : prev.map((l) => (l.item.id === id ? { ...l, qty } : l))
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);
  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const { count, subtotal, tax, delivery, total } = useMemo(() => {
    const count = lines.reduce((s, l) => s + l.qty, 0);
    const subtotal = lines.reduce((s, l) => s + l.qty * l.item.price, 0);
    const tax = Math.round(subtotal * 0.05);
    const delivery = subtotal > 0 ? (subtotal > 500 ? 0 : 40) : 0;
    const total = subtotal + tax + delivery;
    return { count, subtotal, tax, delivery, total };
  }, [lines]);

  const value: CartContextValue = {
    lines,
    add,
    remove,
    update,
    clear,
    isOpen,
    openCart,
    closeCart,
    count,
    subtotal,
    tax,
    delivery,
    total,
    lastAddedId,
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
