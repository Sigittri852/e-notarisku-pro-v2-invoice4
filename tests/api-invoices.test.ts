import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Invoice } from "@/lib/invoice";

const listInvoices = vi.fn<() => Promise<Invoice[]>>();
const saveInvoices = vi.fn<(data: Invoice[]) => Promise<void>>();

vi.mock("@/lib/invoice-store", () => ({
  listInvoices: () => listInvoices(),
  saveInvoices: (data: Invoice[]) => saveInvoices(data),
  getInvoice: vi.fn(),
}));

const route = await import("@/app/api/invoices/route");

const invoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: "inv-1",
  nomor: "INV-202601-0001",
  tanggal: "2026-01-05",
  jatuhTempo: "2026-01-20",
  pelanggan: "Budi",
  items: [{ description: "Jasa akta", qty: 1, price: 1_000_000 }],
  diskon: 0,
  ppn: 0,
  status: "Belum Lunas",
  createdAt: "2026-01-05T00:00:00.000Z",
  ...over,
});

const body = (over: Record<string, unknown> = {}) => ({
  tanggal: "2026-03-01",
  pelanggan: "Siti",
  items: [{ description: "Jasa akta", qty: 2, price: 250_000 }],
  ...over,
});

const post = (payload: unknown) => route.POST(new Request("http://localhost/api/invoices", { method: "POST", body: JSON.stringify(payload) }));

const put = (id: string | null, payload: unknown) =>
  route.PUT(
    new Request(`http://localhost/api/invoices${id === null ? "" : `?id=${id}`}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  );

beforeEach(() => {
  listInvoices.mockImplementation(async () => []);
  saveInvoices.mockResolvedValue(undefined);
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-15T10:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("GET /api/invoices", () => {
  it("returns the stored invoices", async () => {
    listInvoices.mockResolvedValue([invoice()]);
    const res = await route.GET();
    await expect(res.json()).resolves.toEqual([invoice()]);
  });
});

describe("POST /api/invoices", () => {
  it("creates an invoice and prepends it to the stored list", async () => {
    const existing = invoice();
    listInvoices.mockResolvedValue([existing]);

    const res = await post(body());
    expect(res.status).toBe(201);

    const saved = saveInvoices.mock.calls[0][0];
    expect(saved).toHaveLength(2);
    expect(saved[1]).toEqual(existing);
    expect(saved[0].pelanggan).toBe("Siti");
    expect(saved[0].createdAt).toBe("2026-03-15T10:00:00.000Z");
    await expect(res.json()).resolves.toEqual({ id: saved[0].id, nomor: saved[0].nomor });
  });

  it("generates the first invoice number of the month when none is supplied", async () => {
    const res = await post(body());
    await expect(res.json()).resolves.toMatchObject({ nomor: "INV-202603-0001" });
  });

  it("continues the sequence from the highest number of the current month", async () => {
    listInvoices.mockResolvedValue([
      invoice({ id: "a", nomor: "INV-202603-0002" }),
      invoice({ id: "b", nomor: "INV-202603-0007" }),
      invoice({ id: "c", nomor: "INV-202602-0099" }),
      invoice({ id: "d", nomor: "INV-202603-abc" }),
    ]);

    const res = await post(body());
    await expect(res.json()).resolves.toMatchObject({ nomor: "INV-202603-0008" });
  });

  it("keeps a client-supplied invoice number", async () => {
    const res = await post(body({ nomor: "INV-KHUSUS-1" }));
    await expect(res.json()).resolves.toMatchObject({ nomor: "INV-KHUSUS-1" });
  });

  it("defaults namaNotaris and status, and clamps negative amounts to 0", async () => {
    await post(body({ diskon: -50_000, ppn: -1, ppnPersen: -11, nilaiTransaksi: -5, njop: -5, sspPph: -5, sspdBphtb: -5, status: "Ngawur" }));

    const saved = saveInvoices.mock.calls[0][0][0];
    expect(saved.namaNotaris).toBe("APRIANI, S.H., M.Kn.");
    expect(saved.status).toBe("Belum Lunas");
    expect([saved.diskon, saved.ppn, saved.ppnPersen, saved.nilaiTransaksi, saved.njop, saved.sspPph, saved.sspdBphtb]).toEqual([
      0, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it("keeps the recognised payment statuses", async () => {
    for (const status of ["Sebagian", "Lunas"] as const) {
      saveInvoices.mockClear();
      await post(body({ status }));
      expect(saveInvoices.mock.calls[0][0][0].status).toBe(status);
    }
  });

  it("drops items without a description and clamps their qty and price", async () => {
    await post(
      body({
        items: [
          { description: "  ", qty: 1, price: 1 },
          { description: "  Jasa  ", qty: -3, price: -100 },
        ],
      }),
    );

    expect(saveInvoices.mock.calls[0][0][0].items).toEqual([{ description: "Jasa", qty: 0, price: 0 }]);
  });

  it("rejects an invoice without tanggal, pelanggan or items", async () => {
    for (const payload of [body({ tanggal: "" }), body({ pelanggan: "" }), body({ items: [] })]) {
      const res = await post(payload);
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({
        error: "Tanggal, pelanggan, dan minimal satu item tagihan wajib diisi.",
      });
    }
    expect(saveInvoices).not.toHaveBeenCalled();
  });
});

describe("PUT /api/invoices", () => {
  it("requires an id", async () => {
    const res = await put(null, body());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "ID wajib" });
  });

  it("returns 404 for an unknown id", async () => {
    listInvoices.mockResolvedValue([invoice()]);
    const res = await put("tidak-ada", body());
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "Invoice tidak ditemukan" });
    expect(saveInvoices).not.toHaveBeenCalled();
  });

  it("replaces the invoice in place and keeps its id", async () => {
    listInvoices.mockResolvedValue([invoice({ id: "other" }), invoice()]);

    const res = await put("inv-1", body({ pelanggan: "Siti" }));
    expect(res.status).toBe(200);

    const saved = saveInvoices.mock.calls[0][0];
    expect(saved).toHaveLength(2);
    expect(saved[1].id).toBe("inv-1");
    expect(saved[1].pelanggan).toBe("Siti");
    expect(saved[0].id).toBe("other");
  });

  it("keeps the existing nomor when the payload omits it", async () => {
    listInvoices.mockResolvedValue([invoice()]);
    const res = await put("inv-1", body());
    await expect(res.json()).resolves.toEqual({ id: "inv-1", nomor: "INV-202601-0001" });
  });
});

describe("DELETE /api/invoices", () => {
  it("removes only the requested invoice", async () => {
    listInvoices.mockResolvedValue([invoice(), invoice({ id: "inv-2" })]);

    const res = await route.DELETE(new Request("http://localhost/api/invoices?id=inv-1", { method: "DELETE" }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(saveInvoices.mock.calls[0][0].map((x) => x.id)).toEqual(["inv-2"]);
  });

  it("is a no-op when the id is missing", async () => {
    listInvoices.mockResolvedValue([invoice()]);
    await route.DELETE(new Request("http://localhost/api/invoices", { method: "DELETE" }));
    expect(saveInvoices.mock.calls[0][0].map((x) => x.id)).toEqual(["inv-1"]);
  });
});
