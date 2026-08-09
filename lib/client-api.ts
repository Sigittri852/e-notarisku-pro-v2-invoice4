import type { Dokumen } from "./types";

/** Membaca respons JSON dengan pesan kesalahan yang informatif bila body bukan JSON. */
export async function readJson(response: Response, context: string) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${context} mengembalikan respons tidak valid: ${text.slice(0, 300)}`);
  }
}

/** Mengunggah berkas ke /api/upload dan mengembalikan metadata dokumen tersimpan. */
export async function uploadFiles(files: FileList | File[] | null): Promise<Dokumen[]> {
  const list = files ? Array.from(files) : [];
  if (!list.length) return [];
  const body = new FormData();
  list.forEach((file) => body.append("files", file));
  const response = await fetch("/api/upload", { method: "POST", body });
  const result = await readJson(response, "API upload");
  if (!response.ok) throw new Error(result.error || "Gagal mengupload file.");
  return result.files || [];
}
