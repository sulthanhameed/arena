import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { CloseIcon } from "./Icons";

interface AdminOrder {
  _id: string;
  orderId: string;
  customer?: { name?: string; email?: string };
  total: number;
  status: string;
  payment: { status: string; method: string };
  createdAt: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const STATUSES = ["received", "preparing", "out_for_delivery", "delivered", "cancelled"];

export default function AdminDashboard({ open, onClose }: Props) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open || user?.role !== "admin") return;
    setLoading(true);
    setError(null);
    import("../lib/api")
      .then(async () => {
        // Direct fetch to admin endpoint
        const token = localStorage.getItem("khang_token");
        const baseUrl =
          (import.meta as ImportMeta & { env: Record<string, string> }).env
            .VITE_API_URL || "http://localhost:5000/api";
        const res = await fetch(`${baseUrl}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load orders");
        const data = await res.json();
        setOrders(data.orders);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [open, user]);

  if (!open) return null;

  // Compute summary stats
  const revenue = orders
    .filter((o) => o.payment.status === "paid")
    .reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled").length;

  const updateStatus = async (id: string, status: string) => {
    const token = localStorage.getItem("khang_token");
    const baseUrl =
      (import.meta as ImportMeta & { env: Record<string, string> }).env
        .VITE_API_URL || "http://localhost:5000/api";
    await fetch(`${baseUrl}/orders/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    setOrders((prev) =>
      prev.map((o) => (o._id === id ? { ...o, status } : o)),
    );
  };

  return (
    <div className="fixed inset-0 z-[80] animate-fade-in">
      <div className="absolute inset-0 bg-khang-ink/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative h-full overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="overflow-hidden rounded-3xl border border-khang-ink/10 bg-white shadow-2xl animate-scale-in">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-khang-ink/8 bg-khang-ink p-7 text-white">
              <div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-300">
                  Admin · 管理
                </div>
                <h2 className="mt-2 font-brush text-3xl font-medium tracking-tight">
                  Order Dashboard
                </h2>
              </div>
              <button
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"
              >
                <CloseIcon />
              </button>
            </div>

            {user?.role !== "admin" ? (
              <div className="p-12 text-center">
                <div className="text-5xl">🔒</div>
                <p className="mt-4 font-mono text-sm uppercase tracking-[0.2em] text-zinc-500">
                  Admin access required
                </p>
                <p className="mt-3 font-body text-sm text-zinc-600">
                  Sign in as <span className="font-mono">admin@khang.com</span> to access the dashboard.
                </p>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 gap-4 border-b border-khang-ink/8 p-6 sm:grid-cols-3">
                  <Stat label="Total Orders" value={String(orders.length)} />
                  <Stat label="Revenue (paid)" value={`₹${revenue.toLocaleString()}`} />
                  <Stat label="Pending" value={String(pending)} accent />
                </div>

                {/* Orders */}
                <div className="p-6">
                  {loading && (
                    <div className="py-10 text-center font-mono text-xs uppercase tracking-[0.25em] text-zinc-400">
                      Loading orders…
                    </div>
                  )}
                  {error && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 font-mono text-xs text-red-600">
                      {error}
                    </div>
                  )}
                  {!loading && !error && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-khang-ink/10 font-mono text-[10px] uppercase tracking-[0.2em] text-khang-ink/50">
                            <th className="py-3 pr-3">Order ID</th>
                            <th className="py-3 pr-3">Customer</th>
                            <th className="py-3 pr-3">Total</th>
                            <th className="py-3 pr-3">Payment</th>
                            <th className="py-3 pr-3">Status</th>
                            <th className="py-3">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {orders.map((o) => (
                            <tr
                              key={o._id}
                              className="border-b border-khang-ink/5 font-body text-[13px]"
                            >
                              <td className="py-3 pr-3 font-mono font-semibold text-khang-red">
                                {o.orderId}
                              </td>
                              <td className="py-3 pr-3">
                                <div className="font-display font-semibold">
                                  {o.customer?.name || "—"}
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {o.customer?.email}
                                </div>
                              </td>
                              <td className="py-3 pr-3 font-brush text-lg font-medium">
                                ₹{o.total}
                              </td>
                              <td className="py-3 pr-3">
                                <PaymentBadge
                                  status={o.payment.status}
                                  method={o.payment.method}
                                />
                              </td>
                              <td className="py-3 pr-3">
                                <select
                                  value={o.status}
                                  onChange={(e) => updateStatus(o._id, e.target.value)}
                                  className="rounded-full border border-khang-ink/15 bg-white px-3 py-1 font-mono text-[11px] uppercase tracking-wider"
                                >
                                  {STATUSES.map((s) => (
                                    <option key={s} value={s}>
                                      {s.replace(/_/g, " ")}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-3 font-mono text-xs text-zinc-500">
                                {new Date(o.createdAt).toLocaleDateString()}
                              </td>
                            </tr>
                          ))}
                          {orders.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-10 text-center font-mono text-xs uppercase tracking-[0.2em] text-zinc-400">
                                No orders yet
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-khang-ink/8 bg-zinc-50 p-5">
      <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-khang-ink/50">
        {label}
      </div>
      <div
        className={`mt-2 font-brush text-3xl font-medium tracking-tight ${accent ? "text-khang-red" : "text-khang-ink"}`}
      >
        {value}
      </div>
    </div>
  );
}

function PaymentBadge({ status, method }: { status: string; method: string }) {
  const colors: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
    refunded: "bg-zinc-100 text-zinc-600",
  };
  return (
    <div className="flex flex-col gap-1">
      <span
        className={`inline-flex w-fit rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${colors[status] || "bg-zinc-100"}`}
      >
        {status}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        {method}
      </span>
    </div>
  );
}
