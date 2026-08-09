import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { listAkta } from "@/lib/store";
import { errorResponse } from "@/lib/api-error";

export const runtime = "nodejs";

export async function GET() {
  try {
    return await buildWorkbook();
  } catch (error) {
    return errorResponse("EXPORT HONORARIUM ERROR", error, "Gagal membuat rekap honorarium.");
  }
}

async function buildWorkbook() {
  const data = await listAkta();
  const wb = new ExcelJS.Workbook();
  wb.creator = "e-NotarisKu Pro";
  const ws = wb.addWorksheet("Rekap Honorarium");

  ws.columns = [
    { header: "No", key: "no", width: 5 },
    { header: "Nama Notaris/PPAT", key: "namaNotaris", width: 24 },
    { header: "Nomor Akta", key: "nomorAkta", width: 20 },
    { header: "Tanggal", key: "tanggal", width: 14 },
    { header: "Jenis Akta", key: "jenisAkta", width: 26 },
    { header: "Kategori", key: "kategori", width: 12 },
    { header: "Pihak", key: "pihak", width: 30 },
    { header: "Nilai Transaksi (Rp)", key: "nilaiTransaksi", width: 20 },
    { header: "NJOP PBB (Rp)", key: "njop", width: 18 },
    { header: "SSP PPh (Rp)", key: "sspPph", width: 18 },
    { header: "SSPD BPHTB (Rp)", key: "bphtb", width: 18 },
    { header: "Honorarium (Rp)", key: "honorarium", width: 18 },
    { header: "Status", key: "status", width: 14 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEAF2FF" } };

  let totalHonor = 0;
  data.forEach((x, i) => {
    const pihak = x.pihak?.length ? x.pihak : [{ nama: x.namaPihak, nik: x.nik, npwp: x.npwp }];
    totalHonor += Number(x.honorarium) || 0;
    ws.addRow({
      no: i + 1,
      namaNotaris: x.namaNotaris,
      nomorAkta: x.nomorAkta,
      tanggal: x.tanggal,
      jenisAkta: x.jenisAkta,
      kategori: x.kategori,
      pihak: pihak.map((p) => p.nama).filter(Boolean).join(", "),
      nilaiTransaksi: Number(x.nilaiTransaksi) || 0,
      njop: Number(x.njop) || 0,
      sspPph: Number(x.sspPph) || 0,
      bphtb: Number(x.bphtb) || 0,
      honorarium: Number(x.honorarium) || 0,
      status: x.status,
    });
  });

  ["H", "I", "J", "K", "L"].forEach((col) => {
    ws.getColumn(col).numFmt = '"Rp" #,##0';
  });

  const totalRowIndex = data.length + 2;
  ws.getCell(`F${totalRowIndex}`).value = "TOTAL HONORARIUM";
  ws.getCell(`F${totalRowIndex}`).font = { bold: true };
  ws.getCell(`L${totalRowIndex}`).value = totalHonor;
  ws.getCell(`L${totalRowIndex}`).font = { bold: true };
  ws.getCell(`L${totalRowIndex}`).numFmt = '"Rp" #,##0';

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as BodyInit, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Rekap-Honorarium-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
