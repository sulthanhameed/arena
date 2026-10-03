import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { CloseIcon } from "./Icons";

export default function AuthModal() {
  const { isAuthOpen, authMode, setAuthMode, closeAuth, login, signup } =
    useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    remember: true,
  });

  useEffect(() => {
    if (isAuthOpen) {
      setError(null);
      setForm({ name: "", email: "", phone: "", password: "", remember: true });
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAuthOpen, authMode]);

  if (!isAuthOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (authMode === "login") {
        if (!form.email || !form.password) throw new Error("Fill all fields");
        await login(form.email, form.password);
      } else {
        if (!form.name || !form.email || !form.password)
          throw new Error("Fill all required fields");
        if (form.password.length < 6)
          throw new Error("Password must be at least 6 characters");
        await signup(form.name, form.email, form.password, form.phone);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const isLogin = authMode === "login";

  return (
    <div className="fixed inset-0 z-[70] animate-fade-in">
      <div
        className="absolute inset-0 bg-khang-ink/60 backdrop-blur-md"
        onClick={closeAuth}
      />
      <div className="relative grid h-full place-items-center p-4">
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-khang-ink/10 bg-white shadow-2xl animate-scale-in">
          <button
            onClick={closeAuth}
            className="absolute right-5 top-5 z-10 grid h-10 w-10 place-items-center rounded-full border border-khang-ink/10 bg-white text-khang-ink shadow-sm transition hover:border-khang-ink hover:bg-khang-ink hover:text-white"
          >
            <CloseIcon />
          </button>

          <div className="px-8 pt-10 pb-8">
            {/* Header */}
            <div className="flex items-baseline gap-3">
              <span className="font-cn text-2xl text-khang-red">康</span>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.3em] text-khang-ink/50">
                {isLogin ? "Welcome Back" : "Join Khang"}
              </span>
            </div>
            <h2 className="mt-4 font-brush text-[2.25rem] font-medium leading-[1.1] tracking-[-0.02em] text-khang-ink">
              {isLogin ? (
                <>
                  Sign in to{" "}
                  <span className="italic font-light text-khang-red">Khang</span>
                </>
              ) : (
                <>
                  Create your{" "}
                  <span className="italic font-light text-khang-red">account</span>
                </>
              )}
            </h2>
            <p className="mt-3 font-body text-[14px] font-light leading-relaxed text-zinc-500">
              {isLogin
                ? "Order faster, track meals & save your favourites."
                : "Get a free dim sum on your first order. Members save 10%."}
            </p>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              {!isLogin && (
                <Field
                  label="Full Name"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  placeholder="John Doe"
                  required
                />
              )}
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
                placeholder="you@example.com"
                required
              />
              {!isLogin && (
                <Field
                  label="Phone (optional)"
                  type="tel"
                  value={form.phone}
                  onChange={(v) => setForm({ ...form, phone: v })}
                  placeholder="+91 98765 43210"
                />
              )}
              <Field
                label="Password"
                type="password"
                value={form.password}
                onChange={(v) => setForm({ ...form, password: v })}
                placeholder={isLogin ? "Enter your password" : "Min 6 characters"}
                required
              />

              {isLogin && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 font-mono text-[11px] text-khang-ink/60">
                    <input
                      type="checkbox"
                      checked={form.remember}
                      onChange={(e) =>
                        setForm({ ...form, remember: e.target.checked })
                      }
                      className="h-3.5 w-3.5 accent-khang-ink"
                    />
                    Remember me
                  </label>
                  <a
                    href="#"
                    className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-khang-ink underline-offset-4 hover:text-khang-red hover:underline"
                  >
                    Forgot?
                  </a>
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 font-mono text-[11px] text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-khang-ink py-4 font-display text-[12px] font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-khang-red disabled:opacity-60"
              >
                {loading
                  ? "Please wait…"
                  : isLogin
                    ? "Sign In"
                    : "Create Account"}
              </button>
            </form>

            {/* Divider */}
            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-khang-ink/10" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-khang-ink/40">
                or
              </span>
              <div className="h-px flex-1 bg-khang-ink/10" />
            </div>

            {/* Social */}
            <div className="grid grid-cols-2 gap-3">
              <SocialBtn label="Google" icon="G" />
              <SocialBtn label="Apple" icon="" />
            </div>

            {/* Switch mode */}
            <div className="mt-7 text-center font-body text-[13px] text-khang-ink/60">
              {isLogin ? "New to Khang? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setAuthMode(isLogin ? "signup" : "login")}
                className="font-display font-semibold text-khang-ink underline-offset-4 hover:text-khang-red hover:underline"
              >
                {isLogin ? "Create an account" : "Sign in instead"}
              </button>
            </div>
          </div>

          {/* Footer strip */}
          <div className="border-t border-khang-ink/8 bg-zinc-50 px-8 py-4">
            <p className="text-center font-mono text-[10px] tracking-wide text-khang-ink/40">
              By continuing you agree to our{" "}
              <a href="#" className="underline-offset-2 hover:text-khang-ink hover:underline">
                Terms
              </a>{" "}
              &amp;{" "}
              <a href="#" className="underline-offset-2 hover:text-khang-ink hover:underline">
                Privacy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-khang-ink/60">
        {label}
      </label>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-full border border-khang-ink/15 bg-white px-5 py-3 font-body text-sm tracking-wide text-khang-ink focus:border-khang-ink focus:outline-none"
      />
    </div>
  );
}

function SocialBtn({ label, icon }: { label: string; icon: string }) {
  return (
    <button
      type="button"
      className="flex items-center justify-center gap-2 rounded-full border border-khang-ink/15 bg-white py-3 font-display text-[12px] font-semibold tracking-wide text-khang-ink transition hover:border-khang-ink hover:bg-khang-ink hover:text-white"
    >
      <span className="font-mono text-base">{icon}</span>
      {label}
    </button>
  );
}
