import AppShell from "@/components/AppShell";
import { getInvoice } from "@/lib/invoice-store";
import {
  DEFAULT_NOTARIS,
  hasDataPajak,
  invoicePpn,
  invoiceSubtotal,
  invoiceTaxLines,
  invoiceTotal,
} from "@/lib/invoice";
import { rupiah } from "@/lib/constants";
import PrintButton from "@/components/PrintButton";
import InvoiceDeleteButton from "@/components/InvoiceDeleteButton";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const x = await getInvoice(id);
  if (!x) notFound();

  const subtotal = invoiceSubtotal(x);
  const ppnNominal = invoicePpn(x);
  const total = invoiceTotal(x);
  const pajakLines = invoiceTaxLines(x);

  return (
    <AppShell>
      <section className="hero no-print">
        <div><h1>Invoice / Tagihan</h1><div>{x.nomor} · {x.pelanggan}</div></div>
        <div className="actions">
          <Link className="btn btn-light" href={`/invoice/baru?edit=${x.id}`}>Edit</Link>
          <a className="btn btn-light" href={`/api/invoices/${x.id}/pdf`}>Unduh PDF</a>
          <a className="btn btn-light" href={`/api/invoices/${x.id}/word`}>Export Word</a>
          <PrintButton />
          <InvoiceDeleteButton id={x.id} nomor={x.nomor} redirectTo="/invoice" />
        </div>
      </section>

      <article className="invoice-paper">
        <header className="invoice-head">
          <div>
            <div className="invoice-brand">e-NotarisKu Pro</div>
            <h1>INVOICE / TAGIHAN</h1>
            <p>Administrasi Akta Notaris & PPAT</p>
          </div>
          <div className="invoice-number">
            <span>NO. INVOICE</span><b>{x.nomor}</b>
            <span>TANGGAL</span><b>{x.tanggal}</b>
            <span>JATUH TEMPO</span><b>{x.jatuhTempo || "-"}</b>
          </div>
        </header>

        <div className="invoice-meta">
          <div>
            <small>DITAGIHKAN KEPADA</small>
            <strong>{x.pelanggan}</strong>
            <span>{x.nik || "-"}</span>
            <span>{x.alamat || "-"}</span>
          </div>
          <div>
            <small>REFERENSI AKTA</small>
            <strong>{x.nomorAkta || "-"}</strong>
            <span>{x.jenisAkta || "-"}</span>
            <span>{x.kategori || "NOTARIS / PPAT"}</span>
          </div>
        </div>

        {hasDataPajak(x) && (
          <div className="invoice-meta invoice-pajak-block">
            <div>
              <small>NILAI TRANSAKSI (REFERENSI)</small>
              <strong>{rupiah(x.nilaiTransaksi || 0)}</strong>
            </div>
            <div>
              <small>NJOP PBB (REFERENSI)</small>
              <strong>{rupiah(x.njop || 0)}</strong>
            </div>
            <div>
              <small>SSP PPh</small>
              <strong>{rupiah(x.sspPph || 0)}</strong>
            </div>
            <div>
              <small>SSPD BPHTB</small>
              <strong>{rupiah(x.sspdBphtb || 0)}</strong>
            </div>
          </div>
        )}

        <table className="invoice-paper-table">
          <thead><tr><th>NO</th><th>URAIAN</th><th>QTY</th><th>HARGA</th><th>JUMLAH</th></tr></thead>
          <tbody>
            {x.items.map((it, i) => (
              <tr key={i}><td>{i + 1}</td><td>{it.description}</td><td>{it.qty}</td><td>{rupiah(it.price)}</td><td>{rupiah(it.qty * it.price)}</td></tr>
            ))}
            {pajakLines.map((line, i) => (
              <tr key={line.label}><td>{x.items.length + i + 1}</td><td>{line.label}</td><td>1</td><td>{rupiah(line.value)}</td><td>{rupiah(line.value)}</td></tr>
            ))}
          </tbody>
        </table>

        <div className="invoice-summary">
          <div className="invoice-notes">
            <b>Catatan</b>
            <p>{x.catatan || "-"}</p>
            <p><b>Metode Pembayaran:</b> {x.metodePembayaran || "-"}</p>
          </div>
          <div className="invoice-totals">
            <div>Subtotal <b>{rupiah(subtotal)}</b></div>
            <div>Diskon <b>- {rupiah(x.diskon)}</b></div>
            <div>PPN/Pajak ({x.ppnPersen || 0}%) <b>+ {rupiah(ppnNominal)}</b></div>
            <hr />
            <div className="invoice-grand">TOTAL <b>{rupiah(total)}</b></div>
            <div>Status <span className={`badge ${x.status === "Lunas" ? "green" : "gray"}`}>{x.status}</span></div>
          </div>
        </div>

        <footer className="invoice-footer">
          <div>Terima kasih atas kepercayaan Anda.</div>
          <div className="invoice-sign">
            <p>Hormat kami,</p>
            <strong>{x.namaNotaris || DEFAULT_NOTARIS}</strong>
            <span>Notaris / PPAT</span>
          </div>
        </footer>
      </article>

      <div className="actions no-print invoice-actions">
        <Link className="btn" href="/invoice">← Kembali</Link>
        <Link className="btn btn-light" href={`/invoice/baru?edit=${x.id}`}>Edit</Link>
        <a className="btn btn-light" href={`/api/invoices/${x.id}/pdf`}>Unduh PDF</a>
        <a className="btn btn-light" href={`/api/invoices/${x.id}/word`}>Export Word</a>
        <PrintButton />
        <InvoiceDeleteButton id={x.id} nomor={x.nomor} redirectTo="/invoice" />
      </div>
    </AppShell>
  );
}
