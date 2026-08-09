"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchJson } from "@/lib/fetch-json";
import { errorMessage } from "@/lib/errors";

export default function DeleteButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!confirm("Hapus data akta ini?")) return;
    setBusy(true);
    setError("");
    try {
      await fetchJson(`/api/akta?id=${id}`, { method: "DELETE" });
      router.push("/akta");
      router.refresh();
    } catch (e) {
      setError(errorMessage(e, "Gagal menghapus akta."));
      setBusy(false);
    }
  }

  return (
    <>
      <button className="btn btn-danger no-print" disabled={busy} onClick={handleDelete}>
        {busy ? "Menghapus..." : "Hapus"}
      </button>
      {error && <span className="form-error no-print">{error}</span>}
    </>
  );
}
