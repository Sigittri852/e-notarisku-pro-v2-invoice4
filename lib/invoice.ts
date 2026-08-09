export type InvoiceItem = {
  description: string;
  qty: number;
  price: number;
};

export type Invoice = {
  id: string;
  nomor: string;
  tanggal: string;
  jatuhTempo: string;
  aktaId?: string;
  nomorAkta?: string;
  jenisAkta?: string;
  kategori?: string;
  namaNotaris?: string;
  pelanggan: string;
  alamat?: string;
  nik?: string;
  items: InvoiceItem[];
  /** Data objek & pajak akta (khusus Notaris/PPAT) — bersifat referensi & dapat ditambahkan ke rincian tagihan. */
  nilaiTransaksi?: number;
  njop?: number;
  sspPph?: number;
  sspdBphtb?: number;
  diskon: number;
  /** Persentase PPN, mis. 11 untuk 11%. Jika diisi, nominal PPN dihitung otomatis dari subtotal. */
  ppnPersen?: number;
  ppn: number;
  status: "Belum Lunas" | "Sebagian" | "Lunas";
  catatan?: string;
  metodePembayaran?: string;
  createdAt: string;
};

export const DEFAULT_NOTARIS = "APRIANI, S.H., M.Kn.";

type InvoiceTaxData = Pick<Invoice, "nilaiTransaksi" | "njop" | "sspPph" | "sspdBphtb">;

/** Menandakan tersedianya blok referensi objek & pajak akta (Notaris/PPAT) pada invoice. */
export function hasDataPajak(invoice: Partial<InvoiceTaxData>) {
  return (
    (invoice.nilaiTransaksi || 0) > 0 ||
    (invoice.njop || 0) > 0 ||
    (invoice.sspPph || 0) > 0 ||
    (invoice.sspdBphtb || 0) > 0
  );
}

/** Baris pajak yang otomatis ditambahkan ke rincian tagihan bila nominalnya terisi. */
export function invoiceTaxLines(invoice: Partial<Pick<Invoice, "sspPph" | "sspdBphtb">>) {
  const lines: { label: string; value: number }[] = [];
  if ((invoice.sspPph || 0) > 0) lines.push({ label: "Pajak SSP (PPh)", value: invoice.sspPph || 0 });
  if ((invoice.sspdBphtb || 0) > 0) lines.push({ label: "Pajak SSB (BPHTB)", value: invoice.sspdBphtb || 0 });
  return lines;
}

export function invoiceNumberPrefix(date: Date = new Date()) {
  return `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}-`;
}

/** Nomor invoice berikutnya (mis. INV-202608-0001) berdasarkan nomor yang sudah ada. */
export function nextInvoiceNumber(existing: (string | undefined)[], date: Date = new Date()) {
  const prefix = invoiceNumberPrefix(date);
  const seq = existing
    .filter((nomor): nomor is string => typeof nomor === "string" && nomor.startsWith(prefix))
    .map((nomor) => Number(nomor.slice(prefix.length)))
    .filter(Number.isFinite);
  const next = (seq.length ? Math.max(...seq) : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export function invoiceSubtotal(invoice: Pick<Invoice, "items" | "sspPph" | "sspdBphtb">) {
  const itemsTotal = invoice.items.reduce((sum, item) => sum + (Number(item.qty) || 0) * (Number(item.price) || 0), 0);
  return itemsTotal + (Number(invoice.sspPph) || 0) + (Number(invoice.sspdBphtb) || 0);
}

/** Menghitung nominal PPN: memakai persentase (dari subtotal) jika tersedia, jika tidak memakai nominal PPN tersimpan. */
export function invoicePpn(invoice: Pick<Invoice, "items" | "sspPph" | "sspdBphtb" | "ppnPersen" | "ppn">) {
  const persen = Number(invoice.ppnPersen) || 0;
  if (persen > 0) {
    const subtotal = invoiceSubtotal(invoice);
    return Math.round((subtotal * persen) / 100);
  }
  return Number(invoice.ppn) || 0;
}

export function invoiceTotal(invoice: Pick<Invoice, "items" | "sspPph" | "sspdBphtb" | "diskon" | "ppn" | "ppnPersen">) {
  const subtotal = invoiceSubtotal(invoice);
  const ppn = invoicePpn(invoice);
  return Math.max(0, subtotal - (Number(invoice.diskon) || 0)) + ppn;
}

