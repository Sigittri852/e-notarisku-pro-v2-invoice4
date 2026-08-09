import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
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
import { downloadSlug } from "@/lib/format";
import { PDF_CONTENT_TYPE, attachmentResponse } from "@/lib/http";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const x = await getInvoice(id);
  if (!x) return new NextResponse("Invoice tidak ditemukan", { status: 404 });

  const subtotal = invoiceSubtotal(x);
  const ppnNominal = invoicePpn(x);
  const total = invoiceTotal(x);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let y = 56;

  // Header
  doc.setTextColor(7, 93, 229);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("e-NotarisKu Pro", marginX, y);

  doc.setTextColor(20, 42, 69);
  doc.setFontSize(26);
  y += 30;
  doc.text("INVOICE / TAGIHAN", marginX, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(107, 125, 149);
  y += 18;
  doc.text("Administrasi Akta Notaris & PPAT", marginX, y);

  // Nomor / tanggal (kanan atas)
  doc.setFontSize(9);
  doc.setTextColor(113, 129, 152);
  const rightX = pageWidth - marginX;
  let ry = 56;
  const rightRow = (label: string, value: string) => {
    doc.setTextColor(113, 129, 152);
    doc.setFont("helvetica", "normal");
    doc.text(label, rightX, ry, { align: "right" });
    ry += 13;
    doc.setTextColor(20, 42, 69);
    doc.setFont("helvetica", "bold");
    doc.text(value || "-", rightX, ry, { align: "right" });
    ry += 16;
  };
  rightRow("NO. INVOICE", x.nomor);
  rightRow("TANGGAL", x.tanggal);
  rightRow("JATUH TEMPO", x.jatuhTempo || "-");

  y += 14;
  doc.setDrawColor(7, 93, 229);
  doc.setLineWidth(2);
  doc.line(marginX, y, pageWidth - marginX, y);

  // Meta: ditagihkan kepada / referensi akta
  y += 28;
  const colWidth = (pageWidth - marginX * 2) / 2;
  doc.setFontSize(9);
  doc.setTextColor(113, 129, 152);
  doc.setFont("helvetica", "bold");
  doc.text("DITAGIHKAN KEPADA", marginX, y);
  doc.text("REFERENSI AKTA", marginX + colWidth, y);

  y += 16;
  doc.setFontSize(12);
  doc.setTextColor(20, 42, 69);
  doc.text(x.pelanggan || "-", marginX, y);
  doc.text(x.nomorAkta || "-", marginX + colWidth, y);

  y += 15;
  doc.setFontSize(10);
  doc.setTextColor(83, 103, 127);
  doc.text(x.nik || "-", marginX, y);
  doc.text(x.jenisAkta || "-", marginX + colWidth, y);

  y += 15;
  doc.text(x.alamat || "-", marginX, y);
  doc.text(x.kategori || "NOTARIS / PPAT", marginX + colWidth, y);

  // Blok referensi Nilai Transaksi / NJOP / SSP PPh / SSPD BPHTB (khusus Notaris/PPAT)
  if (hasDataPajak(x)) {
    y += 24;
    doc.setFillColor(247, 250, 255);
    doc.rect(marginX, y, pageWidth - marginX * 2, 46, "F");
    const quarterW = (pageWidth - marginX * 2) / 4;
    const pajakCol = (i: number, label: string, value: number) => {
      const cx = marginX + 14 + i * quarterW;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(113, 129, 152);
      doc.text(label, cx, y + 17);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20, 42, 69);
      doc.text(rupiah(value), cx, y + 34);
    };
    pajakCol(0, "NILAI TRANSAKSI", x.nilaiTransaksi || 0);
    pajakCol(1, "NJOP PBB", x.njop || 0);
    pajakCol(2, "SSP PPh", x.sspPph || 0);
    pajakCol(3, "SSPD BPHTB", x.sspdBphtb || 0);
    y += 46;
  }

  // Tabel rincian
  y += 30;
  const tableTop = y;
  const colX = {
    no: marginX,
    uraian: marginX + 30,
    qty: pageWidth - marginX - 190,
    harga: pageWidth - marginX - 130,
    jumlah: pageWidth - marginX,
  };
  doc.setFillColor(7, 93, 229);
  doc.rect(marginX, tableTop, pageWidth - marginX * 2, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("NO", colX.no + 6, tableTop + 16);
  doc.text("URAIAN", colX.uraian, tableTop + 16);
  doc.text("QTY", colX.qty, tableTop + 16, { align: "right" });
  doc.text("HARGA", colX.harga, tableTop + 16, { align: "right" });
  doc.text("JUMLAH", colX.jumlah, tableTop + 16, { align: "right" });

  y = tableTop + 24;
  doc.setTextColor(20, 42, 69);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  x.items.forEach((it, i) => {
    const rowH = 24;
    doc.text(String(i + 1), colX.no + 6, y + 16);
    doc.text(String(it.description || "-"), colX.uraian, y + 16, { maxWidth: colX.qty - colX.uraian - 10 });
    doc.text(String(it.qty), colX.qty, y + 16, { align: "right" });
    doc.text(rupiah(it.price), colX.harga, y + 16, { align: "right" });
    doc.text(rupiah((it.qty || 0) * (it.price || 0)), colX.jumlah, y + 16, { align: "right" });
    doc.setDrawColor(227, 235, 245);
    doc.line(marginX, y + rowH, pageWidth - marginX, y + rowH);
    y += rowH;
  });
  let nomorBaris = x.items.length;
  invoiceTaxLines(x).forEach((row) => {
    nomorBaris += 1;
    const rowH = 24;
    doc.text(String(nomorBaris), colX.no + 6, y + 16);
    doc.text(row.label, colX.uraian, y + 16);
    doc.text("1", colX.qty, y + 16, { align: "right" });
    doc.text(rupiah(row.value), colX.harga, y + 16, { align: "right" });
    doc.text(rupiah(row.value), colX.jumlah, y + 16, { align: "right" });
    doc.setDrawColor(227, 235, 245);
    doc.line(marginX, y + rowH, pageWidth - marginX, y + rowH);
    y += rowH;
  });

  // Catatan + ringkasan total
  y += 24;
  const notesWidth = colWidth - 20;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 42, 69);
  doc.text("Catatan", marginX, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(83, 103, 127);
  const catatanLines = doc.splitTextToSize(x.catatan || "-", notesWidth);
  doc.text(catatanLines, marginX, y + 15);
  const metodeY = y + 15 + catatanLines.length * 13 + 10;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 42, 69);
  doc.text("Metode Pembayaran:", marginX, metodeY);
  doc.setFont("helvetica", "normal");
  doc.text(x.metodePembayaran || "-", marginX + 110, metodeY);

  const totalsX0 = marginX + colWidth + 20;
  const totalsX1 = pageWidth - marginX;
  let ty = y;
  const totalRow = (label: string, value: string, bold = false, big = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(big ? 15 : 11);
    doc.setTextColor(big ? 7 : 20, big ? 89 : 42, big ? 207 : 69);
    doc.text(label, totalsX0, ty);
    doc.text(value, totalsX1, ty, { align: "right" });
    ty += big ? 22 : 18;
  };
  totalRow("Subtotal", rupiah(subtotal));
  totalRow("Diskon", "- " + rupiah(x.diskon));
  totalRow(`PPN/Pajak (${x.ppnPersen || 0}%)`, "+ " + rupiah(ppnNominal));
  doc.setDrawColor(219, 229, 242);
  doc.line(totalsX0, ty, totalsX1, ty);
  ty += 18;
  totalRow("TOTAL", rupiah(total), true, true);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 42, 69);
  doc.text("Status:", totalsX0, ty);
  doc.setTextColor(x.status === "Lunas" ? 8 : 70, x.status === "Lunas" ? 122 : 80, x.status === "Lunas" ? 54 : 95);
  doc.text(x.status, totalsX1, ty, { align: "right" });

  // Footer / tanda tangan
  const footerY = Math.max(ty + 90, 760);
  doc.setDrawColor(226, 234, 244);
  doc.line(marginX, footerY - 30, pageWidth - marginX, footerY - 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 119, 142);
  doc.text("Terima kasih atas kepercayaan Anda.", marginX, footerY);
  doc.text("Hormat kami,", pageWidth - marginX, footerY - 40, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setTextColor(20, 42, 69);
  doc.text(x.namaNotaris || DEFAULT_NOTARIS, pageWidth - marginX, footerY + 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(100, 119, 142);
  doc.text("Notaris / PPAT", pageWidth - marginX, footerY + 22, { align: "right" });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return attachmentResponse(
    pdfBuffer,
    PDF_CONTENT_TYPE,
    `Invoice_${downloadSlug(x.nomor, "invoice")}.pdf`,
  );
}
