/**
 * Pembungkus fetch untuk sisi klien: kegagalan jaringan, respons non-JSON, dan
 * status error selalu menjadi Error dengan pesan yang dapat ditampilkan.
 */
export async function fetchJson<T = any>(input: RequestInfo, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    console.error("NETWORK ERROR:", input, error);
    throw new Error("Tidak dapat terhubung ke server. Periksa koneksi internet Anda.");
  }

  const text = await response.text();
  let data: any;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `Server membalas respons tidak valid (${response.status}): ${text.slice(0, 200)}`,
      );
    }
  }

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Permintaan gagal (${response.status}).`);
  }
  return data as T;
}
