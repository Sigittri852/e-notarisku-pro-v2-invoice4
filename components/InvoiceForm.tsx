"use client";
import { useMemo, useState } from "react";
import type { Akta } from "@/lib/types";
import type { InvoiceItem } from "@/lib/invoice";
import { invoiceSubtotal, invoicePpn, invoiceTotal } from "@/lib/invoice";
import { rupiah } from "@/lib/constants";
import CurrencyInput from "@/components/CurrencyInput";
import InvoiceDeleteButton from "@/components/InvoiceDeleteButton";
import { fetchJson } from "@/lib/fetch-json";
import { errorMessage } from "@/lib/errors";

const DEFAULT_NOTARIS = "APRIANI, S.H., M.Kn.";

export default function InvoiceForm({ akta, invoice }: { akta?: Akta; invoice?: any }) {
  const [nomor, setNomor] = useState(invoice?.nomor || "");
  const [tanggal, setTanggal] = useState(invoice?.tanggal || new Date().toISOString().slice(0,10));
  const [jatuhTempo, setJatuhTempo] = useState(invoice?.jatuhTempo || new Date(Date.now()+7*86400000).toISOString().slice(0,10));
  const [namaNotaris, setNamaNotaris] = useState(invoice?.namaNotaris || akta?.namaNotaris || DEFAULT_NOTARIS);
  const pihak = akta?.pihak?.length ? akta.pihak : [{nama: akta?.namaPihak || "", nik: akta?.nik || "", npwp: akta?.npwp || ""}];
  const [pelanggan, setPelanggan] = useState(invoice?.pelanggan || pihak.map((x:any)=>x.nama).filter(Boolean).join(", "));
  const [alamat, setAlamat] = useState(invoice?.alamat || akta?.alamat || "");
  const [nik, setNik] = useState(invoice?.nik || pihak.map((x:any)=>x.nik).filter(Boolean).join(", "));
  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items?.length ? invoice.items : [{description: akta ? `Honorarium ${akta.jenisAkta} No. ${akta.nomorAkta}` : "Jasa Notaris / PPAT", qty: 1, price: akta?.honorarium || 0}]);

  // Data objek & pajak akta (khusus Notaris/PPAT)
  const [nilaiTransaksi, setNilaiTransaksi] = useState<number>(invoice?.nilaiTransaksi ?? akta?.nilaiTransaksi ?? 0);
  const [njop, setNjop] = useState<number>(invoice?.njop ?? akta?.njop ?? 0);
  const [sspPph, setSspPph] = useState<number>(invoice?.sspPph ?? akta?.sspPph ?? 0);
  const [sspdBphtb, setSspdBphtb] = useState<number>(invoice?.sspdBphtb ?? akta?.bphtb ?? 0);

  const [diskon, setDiskon] = useState(invoice?.diskon || 0);
  const initialSubtotalForPersen = invoiceSubtotal({ items: invoice?.items?.length ? invoice.items : [], sspPph: invoice?.sspPph, sspdBphtb: invoice?.sspdBphtb });
  const [ppnPersen, setPpnPersen] = useState<number>(
    invoice?.ppnPersen || (invoice?.ppn && initialSubtotalForPersen > 0 ? Math.round((invoice.ppn / initialSubtotalForPersen) * 100) : 0)
  );
  const [ppnLegacy] = useState<number>(invoice?.ppn || 0); // fallback nominal PPN lama jika persen belum diisi
  const [status, setStatus] = useState(invoice?.status || "Belum Lunas");
  const [metodePembayaran, setMetodePembayaran] = useState(invoice?.metodePembayaran || "Transfer Bank");
  const [catatan, setCatatan] = useState(invoice?.catatan || "Pembayaran sesuai tagihan.");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const subtotal = useMemo(()=>invoiceSubtotal({items, sspPph, sspdBphtb}),[items, sspPph, sspdBphtb]);
  const ppnNominal = useMemo(()=>invoicePpn({items, sspPph, sspdBphtb, ppnPersen, ppn: ppnLegacy}),[items, sspPph, sspdBphtb, ppnPersen, ppnLegacy]);
  const total = useMemo(()=>invoiceTotal({items, sspPph, sspdBphtb, diskon, ppn: ppnLegacy, ppnPersen}),[items, sspPph, sspdBphtb, diskon, ppnPersen, ppnLegacy]);

  async function ensureNumber(){ if(nomor) return nomor; const j=await fetchJson<{nomor?:string}>('/api/invoices/next-number',{cache:'no-store'}); if(!j?.nomor) throw new Error('Gagal mengambil nomor invoice'); setNomor(j.nomor); return j.nomor; }
  function updateItem(i:number, key:keyof InvoiceItem, value:string){setItems(v=>v.map((x,idx)=>idx===i?{...x,[key]:key==='description'?value:Number(value)}:x));}
  async function save(){
    setSaving(true);setError("");
    try{
      const finalNomor=await ensureNumber();
      const payload={
        nomor:finalNomor,tanggal,jatuhTempo,aktaId:akta?.id||invoice?.aktaId,nomorAkta:akta?.nomorAkta||invoice?.nomorAkta,jenisAkta:akta?.jenisAkta||invoice?.jenisAkta,kategori:akta?.kategori||invoice?.kategori,
        namaNotaris,pelanggan,alamat,nik,items,
        nilaiTransaksi,njop,sspPph,sspdBphtb,
        diskon,ppnPersen,ppn:ppnNominal,
        status,metodePembayaran,catatan
      };
      const j=await fetchJson<{id?:string}>('/api/invoices'+(invoice?.id?`?id=${invoice.id}`:''),{method:invoice?.id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!j?.id) throw new Error('Server tidak mengembalikan ID invoice.');
      window.location.href=`/invoice/${j.id}`;
    }catch(e){setError(errorMessage(e,'Gagal menyimpan invoice'));setSaving(false)}
  }
  return <div className="card invoice-builder">
    <div className="invoice-builder-head"><div><h2>Invoice / Tagihan</h2><p className="muted">Buat tagihan profesional berdasarkan akta dan honorarium.</p></div><span className="invoice-chip">{akta?.kategori||invoice?.kategori||'NOTARIS / PPAT'}</span></div>
    {error&&<div className="form-error">{error}</div>}
    <div className="grid form-grid">
      <div className="field"><label>Nomor Invoice</label><input value={nomor} onChange={e=>setNomor(e.target.value)} placeholder="Otomatis: INV-202608-0001"/></div>
      <div className="field"><label>Status Pembayaran</label><select value={status} onChange={e=>setStatus(e.target.value)}><option>Belum Lunas</option><option>Sebagian</option><option>Lunas</option></select></div>
      <div className="field"><label>Tanggal Invoice</label><input type="date" value={tanggal} onChange={e=>setTanggal(e.target.value)}/></div>
      <div className="field"><label>Jatuh Tempo</label><input type="date" value={jatuhTempo} onChange={e=>setJatuhTempo(e.target.value)}/></div>
      <div className="field"><label>Ditagihkan Kepada</label><input value={pelanggan} onChange={e=>setPelanggan(e.target.value)} placeholder="Nama pihak / klien"/></div>
      <div className="field"><label>NIK / Identitas</label><input value={nik} onChange={e=>setNik(e.target.value)}/></div>
      <div className="field full"><label>Alamat Penagihan</label><textarea value={alamat} onChange={e=>setAlamat(e.target.value)} /></div>
      <div className="field full"><label>Nama Notaris / PPAT</label><input value={namaNotaris} onChange={e=>setNamaNotaris(e.target.value)} placeholder={DEFAULT_NOTARIS}/><small>Otomatis terisi dari data akta bila tersedia; dapat diubah manual.</small></div>
    </div>

    <div className="invoice-items">
      <div className="invoice-section-title"><h3>Data Objek & Pajak Akta (Notaris/PPAT)</h3></div>
      <div className="grid form-grid" style={{padding:"0 0 6px"}}>
        <div className="field"><label>Nilai Transaksi (Rp)</label><CurrencyInput value={nilaiTransaksi} onValueChange={setNilaiTransaksi}/><small>Referensi dasar perhitungan — tidak ditagihkan langsung.</small></div>
        <div className="field"><label>NJOP PBB (Rp)</label><CurrencyInput value={njop} onValueChange={setNjop}/><small>Referensi dasar perhitungan pajak — tidak ditagihkan langsung.</small></div>
        <div className="field"><label>SSP PPh (Rp)</label><CurrencyInput value={sspPph} onValueChange={setSspPph}/><small>Otomatis ditambahkan ke subtotal & total tagihan.</small></div>
        <div className="field"><label>SSPD BPHTB (Rp)</label><CurrencyInput value={sspdBphtb} onValueChange={setSspdBphtb}/><small>Otomatis ditambahkan ke subtotal & total tagihan.</small></div>
      </div>
    </div>

    <div className="invoice-items"><div className="invoice-section-title"><h3>Rincian Tagihan</h3><button type="button" className="btn btn-small" onClick={()=>setItems(v=>[...v,{description:"Jasa / biaya tambahan",qty:1,price:0}])}>+ Tambah Baris</button></div>
      <div className="table-wrap"><table className="table invoice-input-table"><thead><tr><th>Uraian</th><th style={{width:90}}>Qty</th><th style={{width:200}}>Harga (Rp)</th><th style={{width:200}}>Jumlah</th><th></th></tr></thead><tbody>{items.map((it,i)=><tr key={i}><td><input value={it.description} onChange={e=>updateItem(i,'description',e.target.value)}/></td><td><input type="number" min="0" value={it.qty} onChange={e=>updateItem(i,'qty',e.target.value)}/></td><td><CurrencyInput value={it.price} onValueChange={(n)=>setItems(v=>v.map((x,idx)=>idx===i?{...x,price:n}:x))}/></td><td><b>{rupiah((it.qty||0)*(it.price||0))}</b></td><td>{items.length>1&&<button type="button" className="link-danger" onClick={()=>setItems(v=>v.filter((_,idx)=>idx!==i))}>Hapus</button>}</td></tr>)}
        {(sspPph>0)&&<tr className="muted"><td>Pajak SSP (PPh) — otomatis</td><td>1</td><td>{rupiah(sspPph)}</td><td><b>{rupiah(sspPph)}</b></td><td></td></tr>}
        {(sspdBphtb>0)&&<tr className="muted"><td>Pajak SSB (BPHTB) — otomatis</td><td>1</td><td>{rupiah(sspdBphtb)}</td><td><b>{rupiah(sspdBphtb)}</b></td><td></td></tr>}
      </tbody></table></div>
    </div>

    <div className="invoice-bottom-grid">
      <div className="field"><label>Metode Pembayaran</label><select value={metodePembayaran} onChange={e=>setMetodePembayaran(e.target.value)}><option>Transfer Bank</option><option>Tunai</option><option>QRIS</option><option>Lainnya</option></select></div>
      <div className="field"><label>Diskon / Potongan (Rp)</label><CurrencyInput value={diskon} onValueChange={setDiskon}/></div>
      <div className="field"><label>PPN / Pajak (%)</label><input type="number" min="0" max="100" step="0.1" value={ppnPersen} onChange={e=>setPpnPersen(Math.max(0,Number(e.target.value)))}/><small>Ketik persentase (mis. 11) — nominal PPN dihitung otomatis dari subtotal: <b>{rupiah(ppnNominal)}</b></small></div>
      <div className="invoice-total-box"><div>Subtotal (termasuk SSP/BPHTB) <b>{rupiah(subtotal)}</b></div><div>Diskon <b>- {rupiah(diskon)}</b></div><div>PPN/Pajak ({ppnPersen||0}%) <b>+ {rupiah(ppnNominal)}</b></div><hr/><div className="grand">TOTAL TAGIHAN <b>{rupiah(total)}</b></div></div>
      <div className="field full"><label>Catatan / Syarat Pembayaran</label><textarea value={catatan} onChange={e=>setCatatan(e.target.value)} /></div>
    </div>
    <div className="actions"><button className="btn btn-primary" type="button" disabled={saving} onClick={save}>{saving?'Menyimpan...':'Simpan Invoice / Tagihan'}</button><a className="btn" href={akta?`/akta/${akta.id}`:'/invoice'}>Batal</a>{invoice?.id&&<InvoiceDeleteButton id={invoice.id} nomor={invoice.nomor} redirectTo="/invoice"/>}</div>
  </div>
}


