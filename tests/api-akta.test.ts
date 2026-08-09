import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Akta } from "@/lib/types";

const listAkta = vi.fn<() => Promise<Akta[]>>();
const saveAkta = vi.fn<(data: Akta[]) => Promise<void>>();

vi.mock("@/lib/store", () => ({
  listAkta: () => listAkta(),
  saveAkta: (data: Akta[]) => saveAkta(data),
  getAkta: vi.fn(),
}));

const route = await import("@/app/api/akta/route");

const stored = (id: string) => ({ id, pihak: [{ nama: "Lama", nik: "", npwp: "" }] } as unknown as Akta);

const body = (over: Record<string, unknown> = {}) => ({
  nomorAkta: "01/2026",
  tanggal: "2026-03-01",
  jenisAkta: "Akta Jual Beli",
  pihak: [{ nama: "Budi", nik: "3201010101010001", npwp: "01.234.567.8-901.000" }],
  ...over,
});

const post = (payload: unknown) => route.POST(new Request("http://localhost/api/akta", { method: "POST", body: JSON.stringify(payload) }));

const put = (id: string | null, payload: unknown) =>
  route.PUT(
    new Request(`http://localhost/api/akta${id === null ? "" : `?id=${id}`}`, { method: "PUT", body: JSON.stringify(payload) }),
  );

const savedAkta = () => saveAkta.mock.calls[0][0][0];

beforeEach(() => {
  listAkta.mockImplementation(async () => []);
  saveAkta.mockResolvedValue(undefined);
});

afterEach(() => vi.clearAllMocks());

describe("GET /api/akta", () => {
  it("returns the stored akta", async () => {
    listAkta.mockResolvedValue([stored("a")]);
    await expect((await route.GET()).json()).resolves.toEqual([stored("a")]);
  });
});

describe("POST /api/akta", () => {
  it("creates an akta with a generated id and prepends it", async () => {
    listAkta.mockResolvedValue([stored("a")]);
    const res = await post(body());

    expect(res.status).toBe(201);
    const saved = saveAkta.mock.calls[0][0];
    expect(saved).toHaveLength(2);
    expect(saved[1]).toEqual(stored("a"));
    expect(saved[0].id).toMatch(/^[0-9a-f-]{36}$/);
    await expect(res.json()).resolves.toEqual({ id: saved[0].id });
  });

  it("defaults kategori to NOTARIS and status to Draft", async () => {
    await post(body({ kategori: "SESUATU" }));
    expect(savedAkta().kategori).toBe("NOTARIS");
    expect(savedAkta().status).toBe("Draft");
  });

  it("keeps kategori PPAT", async () => {
    await post(body({ kategori: "PPAT" }));
    expect(savedAkta().kategori).toBe("PPAT");
  });

  it("keeps at most 6 pihak and drops the empty ones", async () => {
    await post(
      body({
        pihak: [
          ...Array.from({ length: 7 }, (_, i) => ({ nama: `Pihak ${i + 1}`, nik: "", npwp: "" })),
          { nama: "", nik: "", npwp: "" },
        ],
      }),
    );

    expect(savedAkta().pihak.map((p) => p.nama)).toEqual(["Pihak 1", "Pihak 2", "Pihak 3", "Pihak 4", "Pihak 5", "Pihak 6"]);
  });

  it("keeps only digits in NIK, truncated to 16 characters", async () => {
    await post(body({ pihak: [{ nama: "Budi", nik: "3201-0101 0101 000123456", npwp: "" }] }));
    expect(savedAkta().pihak[0].nik).toBe("3201010101010001");
  });

  it("mirrors the pihak list into the legacy joined fields", async () => {
    await post(
      body({
        pihak: [
          { nama: "Budi", nik: "1111111111111111", npwp: "npwp-1" },
          { nama: "Siti", nik: "2222222222222222", npwp: "npwp-2" },
        ],
      }),
    );

    expect(savedAkta().namaPihak).toBe("Budi; Siti");
    expect(savedAkta().nik).toBe("1111111111111111; 2222222222222222");
    expect(savedAkta().npwp).toBe("npwp-1; npwp-2");
  });

  it("falls back to the legacy single-pihak fields when pihak is absent", async () => {
    await post(body({ pihak: undefined, namaPihak: "Budi", nik: "1111111111111111", npwp: "npwp-1" }));
    expect(savedAkta().pihak).toEqual([{ nama: "Budi", nik: "1111111111111111", npwp: "npwp-1" }]);
  });

  it("drops dokumen without a url and tanda tangan without a dataUrl", async () => {
    await post(
      body({
        dokumen: [{ name: "a.pdf", url: "https://x/a.pdf", type: "pdf", size: 1 }, { name: "b.pdf" }, null],
        minuta: "bukan-array",
        tandaTanganDigital: [{ nama: "Notaris", peran: "Notaris", dataUrl: "data:image/png;base64,AAA", tanggal: "2026-03-01" }, { nama: "Saksi" }],
      }),
    );

    expect(savedAkta().dokumen).toHaveLength(1);
    expect(savedAkta().minuta).toEqual([]);
    expect(savedAkta().tandaTanganDigital).toEqual([
      { nama: "Notaris", peran: "Notaris", dataUrl: "data:image/png;base64,AAA", tanggal: "2026-03-01" },
    ]);
  });

  it("coerces a non-object detail into an empty map", async () => {
    await post(body({ detail: "bukan-objek" }));
    expect(savedAkta().detail).toEqual({});
  });

  it("rejects an akta without a nama for the first pihak", async () => {
    for (const payload of [body({ pihak: [] }), body({ pihak: [{ nama: "", nik: "1111111111111111", npwp: "" }] })]) {
      const res = await post(payload);
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ error: "Minimal nama pihak pertama wajib diisi" });
    }
    expect(saveAkta).not.toHaveBeenCalled();
  });
});

describe("PUT /api/akta", () => {
  it("requires an id", async () => {
    const res = await put(null, body());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "ID wajib" });
  });

  it("returns 404 for an unknown id", async () => {
    listAkta.mockResolvedValue([stored("a")]);
    const res = await put("zzz", body());
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Data tidak ditemukan" });
    expect(saveAkta).not.toHaveBeenCalled();
  });

  it("replaces the akta in place, keeping its id", async () => {
    listAkta.mockResolvedValue([stored("a"), stored("b")]);
    const res = await put("b", body());

    await expect(res.json()).resolves.toEqual({ id: "b" });
    const saved = saveAkta.mock.calls[0][0];
    expect(saved[0]).toEqual(stored("a"));
    expect(saved[1].id).toBe("b");
    expect(saved[1].pihak[0].nama).toBe("Budi");
  });

  it("validates the pihak before saving", async () => {
    listAkta.mockResolvedValue([stored("a")]);
    const res = await put("a", body({ pihak: [] }));
    expect(res.status).toBe(400);
    expect(saveAkta).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/akta", () => {
  it("removes only the requested akta", async () => {
    listAkta.mockResolvedValue([stored("a"), stored("b")]);
    const res = await route.DELETE(new Request("http://localhost/api/akta?id=a", { method: "DELETE" }));

    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(saveAkta.mock.calls[0][0].map((x) => x.id)).toEqual(["b"]);
  });

  it("is a no-op when the id is missing", async () => {
    listAkta.mockResolvedValue([stored("a")]);
    await route.DELETE(new Request("http://localhost/api/akta", { method: "DELETE" }));
    expect(saveAkta.mock.calls[0][0].map((x) => x.id)).toEqual(["a"]);
  });
});
