import { NextResponse } from "next/server";
import { listInvoices } from "@/lib/invoice-store";
import { invoiceNumberPrefix, nextInvoiceNumber } from "@/lib/invoice";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const all = await listInvoices();

    return NextResponse.json({
      nomor: nextInvoiceNumber(all.map((x) => x.nomor)),
    });
  } catch (error) {
    console.error("NEXT NUMBER ERROR:", error);

    return NextResponse.json(
      {
        error: "Gagal membuat nomor invoice",
        nomor: `${invoiceNumberPrefix()}0001`,
      },
      { status: 500 }
    );
  }
}
