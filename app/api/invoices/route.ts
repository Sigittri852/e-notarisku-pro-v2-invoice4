import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { listInvoices, saveInvoices } from "@/lib/invoice-store";
import { DEFAULT_NOTARIS, nextInvoiceNumber, type Invoice, type InvoiceItem } from "@/lib/invoice";
import { nonNegative, str } from "@/lib/coerce";

const cleanItems = (v: unknown): InvoiceItem[] => Array.isArray(v)
  ? v.map((x: any) => ({ description: str(x?.description).trim(), qty: nonNegative(x?.qty), price: nonNegative(x?.price) })).filter(x => x.description)
  : [];

async function nextNumber() {
  return nextInvoiceNumber((await listInvoices()).map(x => x.nomor));
}

function normalize(body: any, id?: string): Invoice {
  return {
    id: id || randomUUID(), nomor: str(body.nomor), tanggal: str(body.tanggal), jatuhTempo: str(body.jatuhTempo),
    aktaId: str(body.aktaId) || undefined, nomorAkta: str(body.nomorAkta), jenisAkta: str(body.jenisAkta), kategori: str(body.kategori),
    namaNotaris: str(body.namaNotaris) || DEFAULT_NOTARIS,
    pelanggan: str(body.pelanggan), alamat: str(body.alamat), nik: str(body.nik), items: cleanItems(body.items),
    nilaiTransaksi: nonNegative(body.nilaiTransaksi), njop: nonNegative(body.njop),
    sspPph: nonNegative(body.sspPph), sspdBphtb: nonNegative(body.sspdBphtb),
    diskon: nonNegative(body.diskon), ppnPersen: nonNegative(body.ppnPersen), ppn: nonNegative(body.ppn),
    status: body.status === "Lunas" || body.status === "Sebagian" ? body.status : "Belum Lunas",
    catatan: str(body.catatan), metodePembayaran: str(body.metodePembayaran), createdAt: body.createdAt || new Date().toISOString()
  };
}

export async function GET() { return NextResponse.json(await listInvoices()); }

export async function POST(req: Request) {
  const body = await req.json();
  const data = await listInvoices();
  const a = normalize(body);
  if (!a.nomor) a.nomor = await nextNumber();
  if (!a.tanggal || !a.pelanggan || !a.items.length) return NextResponse.json({ error: "Tanggal, pelanggan, dan minimal satu item tagihan wajib diisi." }, { status: 400 });
  data.unshift(a);
  await saveInvoices(data);
  return NextResponse.json({ id: a.id, nomor: a.nomor }, { status: 201 });
}

export async function PUT(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID wajib" }, { status: 400 });
  const data = await listInvoices();
  const i = data.findIndex(x => x.id === id);
  if (i < 0) return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 });
  const a = normalize(await req.json(), id);
  if (!a.nomor) a.nomor = data[i].nomor;
  data[i] = a;
  await saveInvoices(data);
  return NextResponse.json({ id: a.id, nomor: a.nomor });
}

export async function DELETE(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  const data = await listInvoices();
  await saveInvoices(data.filter(x => x.id !== id));
  return NextResponse.json({ ok: true });
}
