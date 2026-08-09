"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(form.get("email") ?? ""),
          password: String(form.get("password") ?? ""),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Gagal masuk.");
        return;
      }
      const next = params.get("next");
      router.replace(next && next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch {
      setError("Tidak dapat menghubungi server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="card">
        <h1>e-NotarisKu Pro</h1>
        <p className="muted">Masuk ke dashboard kantor Notaris &amp; PPAT</p>
        <form className="grid" onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input name="email" type="email" autoComplete="username" required />
          </div>
          <div className="field">
            <label>Password</label>
            <input name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Memproses..." : "Masuk"}
          </button>
          {error && <p style={{ color: "#c0392b", fontSize: 13 }}>{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
