"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.replace("/overview");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm font-semibold">
        البريد الإلكتروني / Email
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="email"
          required
          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-3 py-2.5 outline-none focus:border-[var(--intel-cyan)]"
        />
      </label>
      <label className="block text-sm font-semibold">
        كلمة المرور / Password
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-3)] px-3 py-2.5 outline-none focus:border-[var(--intel-cyan)]"
        />
      </label>
      {error ? <p className="text-sm text-[var(--danger-red)]">{error}</p> : null}
      <button
        disabled={pending}
        className="w-full rounded-xl bg-[var(--intel-cyan)] px-4 py-2.5 font-extrabold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "جارٍ الدخول… / Signing in…" : "دخول HBI / Enter HBI"}
      </button>
    </form>
  );
}
