import { NextResponse } from "next/server";
import { getInvoice } from "@/lib/invoice-store";
import { invoiceSubtotal, invoicePpn, invoiceTotal } from "@/lib/invoice";
import { rupiah } from "@/lib/constants";
import { errorResponse } from "@/lib/api-error";
const esc=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  return await buildDoc(id);
 }catch(error){
  return errorResponse('INVOICE WORD ERROR',error,'Gagal membuat dokumen Word invoice.');
 }
}

async function buildDoc(id:string){
 const x=await getInvoice(id); if(!x)return new NextResponse('Invoice tidak ditemukan',{status:404});
 let rows=x.items.map((it,i)=>`<tr><td>${i+1}</td><td>${esc(it.description)}</td><td>${it.qty}</td><td>${rupiah(it.price)}</td><td>${rupiah(it.qty*it.price)}</td></tr>`).join('');
 let nomorBaris=x.items.length;
 if((x.sspPph||0)>0){nomorBaris+=1;rows+=`<tr><td>${nomorBaris}</td><td>Pajak SSP (PPh)</td><td>1</td><td>${rupiah(x.sspPph||0)}</td><td>${rupiah(x.sspPph||0)}</td></tr>`;}
 if((x.sspdBphtb||0)>0){nomorBaris+=1;rows+=`<tr><td>${nomorBaris}</td><td>Pajak SSB (BPHTB)</td><td>1</td><td>${rupiah(x.sspdBphtb||0)}</td><td>${rupiah(x.sspdBphtb||0)}</td></tr>`;}
 const adaDataPajak=(x.nilaiTransaksi||0)>0||(x.njop||0)>0||(x.sspPph||0)>0||(x.sspdBphtb||0)>0;
 const pajakBlock=adaDataPajak?`<table style="margin:14px 0"><tr><th>Nilai Transaksi</th><th>NJOP PBB</th><th>SSP PPh</th><th>SSPD BPHTB</th></tr><tr><td>${rupiah(x.nilaiTransaksi||0)}</td><td>${rupiah(x.njop||0)}</td><td>${rupiah(x.sspPph||0)}</td><td>${rupiah(x.sspdBphtb||0)}</td></tr></table>`:'';
 const ppnNominal=invoicePpn(x);
 const html=`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;color:#142a45}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cfd8e5;padding:9px}th{background:#eaf2ff;text-align:left}.right{text-align:right}.head{border-bottom:3px solid #075de5;padding-bottom:15px}.muted{color:#66768b;font-size:12px}.total{font-size:18px;font-weight:bold}</style></head><body><div class="head"><h1>e-NotarisKu Pro</h1><h2>INVOICE / TAGIHAN</h2><div class="muted">Administrasi Akta Notaris &amp; PPAT</div></div><p><b>No. Invoice:</b> ${esc(x.nomor)}<br><b>Tanggal:</b> ${esc(x.tanggal)}<br><b>Jatuh Tempo:</b> ${esc(x.jatuhTempo||'-')}</p><p><b>Ditagihkan Kepada:</b><br>${esc(x.pelanggan)}<br>${esc(x.nik||'-')}<br>${esc(x.alamat||'-')}</p><p><b>Referensi Akta:</b> ${esc(x.nomorAkta||'-')} — ${esc(x.jenisAkta||'-')}</p>${pajakBlock}<table><thead><tr><th>No</th><th>Uraian</th><th>Qty</th><th>Harga</th><th>Jumlah</th></tr></thead><tbody>${rows}</tbody></table><table style="margin-top:20px;width:55%;margin-left:auto"><tr><td>Subtotal</td><td class="right">${rupiah(invoiceSubtotal(x))}</td></tr><tr><td>Diskon</td><td class="right">- ${rupiah(x.diskon)}</td></tr><tr><td>PPN/Pajak (${x.ppnPersen||0}%)</td><td class="right">+ ${rupiah(ppnNominal)}</td></tr><tr><td class="total">TOTAL</td><td class="right total">${rupiah(invoiceTotal(x))}</td></tr></table><p><b>Metode Pembayaran:</b> ${esc(x.metodePembayaran||'-')}</p><p><b>Catatan:</b> ${esc(x.catatan||'-')}</p><br><p style="text-align:right">Hormat kami,<br><br><br><b>${esc(x.namaNotaris||'APRIANI, S.H., M.Kn.')}</b><br>Notaris / PPAT</p></body></html>`;
 return new NextResponse(html,{headers:{'Content-Type':'application/msword; charset=utf-8','Content-Disposition':`attachment; filename="${x.nomor.replace(/[^a-zA-Z0-9_-]/g,'_')}.doc"`}});
}

