"use client";
import AppShell from "@/components/AppShell";
import { useState } from "react";

export default function Page() {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const lama = String(data.get("lama"));
    const baru = String(data.get("baru"));
    const konfirmasi = String(data.get("konfirmasi"));

    if (baru.length < 8) return setMsg("Password minimal 8 karakter.");
    if (baru !== konfirmasi) return setMsg("Konfirmasi password tidak sama.");

    setBusy(true);
    setMsg("");
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passwordLama: lama, passwordBaru: baru }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMsg(body.message || "Gagal mengganti password.");
        return;
      }
      form.reset();
      setMsg("Password berhasil diperbarui.");
    } catch {
      setMsg("Tidak dapat menghubungi server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <section className="hero compact">
        <div>
          <h1>Ganti Password</h1>
          <p>Perbarui password akun Anda secara berkala.</p>
        </div>
        <div className="hero-icon">🔐</div>
      </section>
      <form className="card grid form-grid" onSubmit={submit}>
        <div className="field full">
          <label>Password Lama</label>
          <input name="lama" type="password" autoComplete="current-password" required />
        </div>
        <div className="field">
          <label>Password Baru</label>
          <input name="baru" type="password" autoComplete="new-password" required />
        </div>
        <div className="field">
          <label>Konfirmasi Password</label>
          <input name="konfirmasi" type="password" autoComplete="new-password" required />
        </div>
        <div className="actions full">
          <button className="btn btn-primary" disabled={busy}>
            {busy ? "Menyimpan..." : "Simpan Password"}
          </button>
          {msg && <span>{msg}</span>}
        </div>
      </form>
    </AppShell>
  );
}
