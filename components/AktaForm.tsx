"use client";
import {useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {AKTA_NOTARIS,AKTA_PPAT,DYNAMIC_FIELDS} from "@/lib/constants";
import {pihakList} from "@/lib/akta";
import {uploadFiles} from "@/lib/client-api";
import {isoDate} from "@/lib/format";
import type {Akta,Dokumen,Kategori,PihakAkta,TandaTanganDigital} from "@/lib/types";
import SignaturePad from "./SignaturePad";
import CurrencyInput from "./CurrencyInput";

const landTypes=["Akta Pengikatan Jual Beli","Akta Kuasa Menjual","Akta Hibah","Akta Jual Beli","Akta Pembagian Hak Bersama","SKMHT","APHT","Akta Inbreng","Akta Tukar-Menukar"];
const emptyPihak=():PihakAkta[]=>Array.from({length:6},()=>({nama:"",nik:"",npwp:"",scanIdentitas:[]}));

export default function AktaForm({initial}:{initial?:Akta}){
 const router=useRouter();
 const[kategori,setKategori]=useState<Kategori>(initial?.kategori||"NOTARIS");
 const jenisList=useMemo(()=>kategori==="NOTARIS"?AKTA_NOTARIS:AKTA_PPAT,[kategori]);
 const[jenisAkta,setJenisAkta]=useState(initial?.jenisAkta||jenisList[0]);
 const[dokumen,setDokumen]=useState<Dokumen[]>(initial?.dokumen||[]);
 const[pihak,setPihak]=useState<PihakAkta[]>(()=>{
   const lama=pihakList(initial);
   return Array.from({length:6},(_,i)=>({scanIdentitas:[],...(lama[i]||{nama:"",nik:"",npwp:""})}));
 });
 const[fotoTtdKlien,setFotoTtdKlien]=useState<Dokumen[]>(initial?.fotoTtdKlien||[]);
 const[fotoTtdNotaris,setFotoTtdNotaris]=useState<Dokumen[]>(initial?.fotoTtdNotaris||[]);
 const[minuta,setMinuta]=useState<Dokumen[]>(initial?.minuta||[]);
 const[tandaTanganDigital,setTandaTanganDigital]=useState<TandaTanganDigital[]>(initial?.tandaTanganDigital||[]);
 const[busy,setBusy]=useState(false);
 const[nilaiTransaksi,setNilaiTransaksi]=useState<number>(initial?.nilaiTransaksi||0);
 const[njop,setNjop]=useState<number>(initial?.njop||0);
 const[sspPph,setSspPph]=useState<number>(initial?.sspPph||0);
 const[bphtb,setBphtb]=useState<number>(initial?.bphtb||0);
 const[honorarium,setHonorarium]=useState<number>(initial?.honorarium||0);
 const dynamic=DYNAMIC_FIELDS[jenisAkta]||[];
 const showLand=kategori==="PPAT"||landTypes.includes(jenisAkta);
 const changeKategori=(k:Kategori)=>{setKategori(k);setJenisAkta((k==="NOTARIS"?AKTA_NOTARIS:AKTA_PPAT)[0]);};
 const updatePihak=(i:number,key:keyof PihakAkta,value:string)=>setPihak(v=>v.map((x,n)=>n===i?{...x,[key]:value}:x));
 async function unggah(files:FileList|null,terima:(dokumen:Dokumen[])=>void){if(!files||!files.length)return;setBusy(true);try{terima(await uploadFiles(files))}catch(e:any){alert(e.message||'Gagal mengupload file.')}finally{setBusy(false)}}
 async function uploadTo(files:FileList|null,setter:(fn:(v:Dokumen[])=>Dokumen[])=>void){await unggah(files,d=>setter(v=>[...v,...d]))}
 async function upload(files:FileList|null){await uploadTo(files,setDokumen)}
 async function uploadIdentitas(i:number,files:FileList|null){await unggah(files,d=>setPihak(v=>v.map((x,n)=>n===i?{...x,scanIdentitas:[...(x.scanIdentitas||[]),...d]}:x)))}
 const removeIdentitas=(i:number,idx:number)=>setPihak(v=>v.map((x,n)=>n===i?{...x,scanIdentitas:(x.scanIdentitas||[]).filter((_,k)=>k!==idx)}:x));
 const addTandaTangan=(dataUrl:string,nama:string,peran:string)=>setTandaTanganDigital(v=>[...v,{nama,peran,dataUrl,tanggal:new Date().toISOString()}]);
 const removeTandaTangan=(idx:number)=>setTandaTanganDigital(v=>v.filter((_,k)=>k!==idx));
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);const fd=new FormData(e.currentTarget);const raw=Object.fromEntries(fd.entries());const detail=Object.fromEntries(dynamic.map(label=>[label,String(raw[`detail_${label}`]||"")]));const pihakTerisi=pihak.filter(x=>x.nama.trim()||x.nik.trim()||x.npwp.trim()||(x.scanIdentitas&&x.scanIdentitas.length));if(!pihakTerisi.length){setBusy(false);return alert('Minimal satu nama pihak harus diisi.')}const body={...raw,kategori,jenisAkta,pihak:pihakTerisi,detail,dokumen,fotoTtdKlien,fotoTtdNotaris,minuta,tandaTanganDigital,nilaiTransaksi,njop,sspPph,bphtb,honorarium};const r=await fetch(initial?`/api/akta?id=${initial.id}`:'/api/akta',{method:initial?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json();setBusy(false);if(!r.ok)return alert(j.error||'Gagal menyimpan');router.push(`/akta/${j.id||initial?.id}`);router.refresh()}
 return <form className="card form-card" onSubmit={submit}>
  <div className="category-tabs"><button type="button" className={kategori==='NOTARIS'?'tab active':'tab'} onClick={()=>changeKategori('NOTARIS')}>⚖ Akta Notaris</button><button type="button" className={kategori==='PPAT'?'tab active':'tab'} onClick={()=>changeKategori('PPAT')}>🏛 Akta PPAT</button></div>
  <div className="grid form-grid">
   <div className="field"><label>Nomor Akta</label><input name="nomorAkta" required defaultValue={initial?.nomorAkta}/></div>
   <div className="field"><label>Tanggal Akta</label><input type="date" name="tanggal" required defaultValue={initial?.tanggal||isoDate()}/></div>
   <div className="field"><label>Jenis Akta {kategori}</label><select name="jenisAkta" value={jenisAkta} onChange={e=>setJenisAkta(e.target.value)}>{jenisList.map(x=><option key={x}>{x}</option>)}</select></div>
   <div className="field"><label>Nama Notaris / PPAT</label><input name="namaNotaris" required placeholder="Nama lengkap dan gelar" defaultValue={initial?.namaNotaris}/></div>

   <div className="field full pihak-section">
    <div className="pihak-title"><div><label>Data Para Pihak</label><small>Isi maksimal 6 pihak. Baris yang tidak digunakan boleh dikosongkan.</small></div><span className="badge">6 Pihak</span></div>
    <div className="pihak-table-wrap"><table className="pihak-table"><thead><tr><th>No.</th><th>Nama Pihak</th><th>KTP / NIK</th><th>NPWP</th><th>Scan Identitas</th></tr></thead><tbody>{pihak.map((x,i)=><tr key={i}><td><b>{i+1}</b></td><td><input aria-label={`Nama pihak ${i+1}`} value={x.nama} onChange={e=>updatePihak(i,'nama',e.target.value)} placeholder={`Nama pihak ${i+1}`} required={i===0}/></td><td><input aria-label={`NIK pihak ${i+1}`} value={x.nik} onChange={e=>updatePihak(i,'nik',e.target.value.replace(/\D/g,'').slice(0,16))} inputMode="numeric" maxLength={16} placeholder="16 digit NIK"/></td><td><input aria-label={`NPWP pihak ${i+1}`} value={x.npwp} onChange={e=>updatePihak(i,'npwp',e.target.value)} placeholder="Nomor NPWP"/></td><td><label className="mini-upload-btn">📷 Scan KTP<input type="file" accept="image/*,.pdf" multiple hidden onChange={e=>uploadIdentitas(i,e.target.files)}/></label>{!!(x.scanIdentitas&&x.scanIdentitas.length)&&<ul className="mini-file-list">{x.scanIdentitas!.map((d,idx)=><li key={idx}><a href={d.url} target="_blank">{d.name.length>16?d.name.slice(0,14)+'…':d.name}</a><button type="button" onClick={()=>removeIdentitas(i,idx)}>✕</button></li>)}</ul>}</td></tr>)}</tbody></table></div>
   </div>

   <div className="field full"><label>Alamat</label><textarea name="alamat" defaultValue={initial?.alamat}/></div>
   {showLand&&<><div className="field"><label>Nomor Sertipikat</label><input name="nomorSertifikat" defaultValue={initial?.nomorSertifikat}/></div><div className="field"><label>Jenis Hak</label><input name="jenisHak" placeholder="SHM / HGB / Hak Pakai" defaultValue={initial?.jenisHak}/></div><div className="field"><label>Luas Tanah (m²)</label><input name="luasTanah" type="number" step="0.01" defaultValue={initial?.luasTanah}/></div><div className="field"><label>Nilai Transaksi (Rp)</label><CurrencyInput value={nilaiTransaksi} onValueChange={setNilaiTransaksi}/><small>Contoh: 1.000.000.000</small></div><div className="field"><label>NOP PBB / Tahun</label><input name="nopPbb" defaultValue={initial?.nopPbb}/></div><div className="field"><label>NJOP (Rp)</label><CurrencyInput value={njop} onValueChange={setNjop}/></div><div className="field"><label>Tanggal SSP PPh</label><input name="tanggalSsp" type="date" defaultValue={initial?.tanggalSsp}/></div><div className="field"><label>SSP PPh (Rp)</label><CurrencyInput value={sspPph} onValueChange={setSspPph}/></div><div className="field"><label>Tanggal SSPD BPHTB</label><input name="tanggalBphtb" type="date" defaultValue={initial?.tanggalBphtb}/></div><div className="field"><label>SSPD BPHTB (Rp)</label><CurrencyInput value={bphtb} onValueChange={setBphtb}/></div></>}
   {dynamic.map(label=><div className="field" key={label}><label>{label}</label><input name={`detail_${label}`} defaultValue={initial?.detail?.[label]||""}/></div>)}
   <div className="field"><label>Honorarium (Rp)</label><CurrencyInput value={honorarium} onValueChange={setHonorarium}/></div><div className="field"><label>Status</label><select name="status" defaultValue={initial?.status||'Draft'}><option>Draft</option><option>Selesai</option><option>Ditandatangani</option></select></div>
   <div className="field full"><label>Keterangan / Catatan</label><textarea name="catatan" defaultValue={initial?.catatan}/></div>
   <div className="field full upload-box"><label>Upload Dokumen Digital</label><input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip" onChange={e=>upload(e.target.files)}/><small>Foto, PDF, Word, Excel, dan ZIP. Maksimal 25 MB per permintaan.</small>{dokumen.length>0&&<ul className="upload-list">{dokumen.map((d,i)=><li key={i}><a target="_blank" href={d.url}>{d.name}</a> <button type="button" className="link-danger" onClick={()=>setDokumen(v=>v.filter((_,k)=>k!==i))}>hapus</button></li>)}</ul>}</div>

   <div className="field full section-box">
    <div className="pihak-title"><div><label>📸 Dokumentasi Proses Tanda Tangan</label><small>Unggah foto saat penandatanganan berlangsung bersama klien maupun notaris.</small></div></div>
    <div className="grid form-grid" style={{padding:0}}>
     <div className="field upload-box"><label>Foto Tanda Tangan dengan Klien</label><input type="file" multiple accept="image/*" onChange={e=>uploadTo(e.target.files,setFotoTtdKlien)}/><small>Foto momen penandatanganan bersama klien / para pihak.</small>{fotoTtdKlien.length>0&&<ul className="upload-list">{fotoTtdKlien.map((d,i)=><li key={i}><a target="_blank" href={d.url}>{d.name}</a> <button type="button" className="link-danger" onClick={()=>setFotoTtdKlien(v=>v.filter((_,k)=>k!==i))}>hapus</button></li>)}</ul>}</div>
     <div className="field upload-box"><label>Foto Tanda Tangan dengan Notaris</label><input type="file" multiple accept="image/*" onChange={e=>uploadTo(e.target.files,setFotoTtdNotaris)}/><small>Foto momen penandatanganan bersama notaris/PPAT.</small>{fotoTtdNotaris.length>0&&<ul className="upload-list">{fotoTtdNotaris.map((d,i)=><li key={i}><a target="_blank" href={d.url}>{d.name}</a> <button type="button" className="link-danger" onClick={()=>setFotoTtdNotaris(v=>v.filter((_,k)=>k!==i))}>hapus</button></li>)}</ul>}</div>
    </div>
   </div>

   <div className="field full section-box">
    <div className="pihak-title"><div><label>🗂 Minuta &amp; Tanda Tangan Digital Notaris</label><small>Unggah berkas minuta akta dan bubuhkan tanda tangan digital yang berhubungan dengan notaris.</small></div></div>
    <div className="field upload-box" style={{marginBottom:16}}><label>Upload Berkas Minuta</label><input type="file" multiple accept=".pdf,.doc,.docx,image/*" onChange={e=>uploadTo(e.target.files,setMinuta)}/><small>Salinan minuta / naskah asli akta yang disimpan notaris. PDF, Word, atau foto.</small>{minuta.length>0&&<ul className="upload-list">{minuta.map((d,i)=><li key={i}><a target="_blank" href={d.url}>{d.name}</a> <button type="button" className="link-danger" onClick={()=>setMinuta(v=>v.filter((_,k)=>k!==i))}>hapus</button></li>)}</ul>}</div>
    <SignaturePad onSave={addTandaTangan}/>
    {tandaTanganDigital.length>0&&<div className="sig-list">{tandaTanganDigital.map((t,i)=><div className="sig-item" key={i}><img src={t.dataUrl} alt={t.nama}/><div><b>{t.nama}</b><small>{t.peran} · {new Date(t.tanggal).toLocaleString('id-ID')}</small></div><button type="button" className="link-danger" onClick={()=>removeTandaTangan(i)}>hapus</button></div>)}</div>}
   </div>

   <div className="actions full"><button disabled={busy} className="btn btn-primary">{busy?'Memproses...':'Simpan Akta'}</button><button type="reset" className="btn" onClick={()=>setPihak(emptyPihak())}>Reset</button><button type="button" className="btn" onClick={()=>router.back()}>Batal</button></div>
  </div>
 </form>
}
