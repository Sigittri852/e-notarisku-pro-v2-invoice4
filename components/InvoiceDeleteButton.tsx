"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchJson } from "@/lib/fetch-json";
import { errorMessage } from "@/lib/errors";

export default function InvoiceDeleteButton({ id, nomor, redirectTo }: { id: string; nomor?: string; redirectTo?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const ok = confirm(`Hapus invoice ${nomor || ""}? Tindakan ini tidak dapat dibatalkan.`);
    if (!ok) return;
    setBusy(true);
    setError("");
    try {
      await fetchJson(`/api/invoices?id=${id}`, { method: "DELETE" });
      if (redirectTo) {
        router.push(redirectTo);
      }
      router.refresh();
    } catch (e) {
      setError(errorMessage(e, "Gagal menghapus invoice."));
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn-danger no-print"
        disabled={busy}
        onClick={handleDelete}
        title="Hapus invoice ini"
      >
        {busy ? "Menghapus..." : "Hapus"}
      </button>
      {error && <span className="form-error no-print">{error}</span>}
    </>
  );
}
