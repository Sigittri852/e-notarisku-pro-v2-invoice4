import {NextResponse} from 'next/server';import {randomUUID} from 'crypto';import {listAkta,saveAkta} from '@/lib/store';import {AppError} from '@/lib/errors';import {errorResponse,readJsonBody} from '@/lib/api-error';import type {Akta,PihakAkta,TandaTanganDigital} from '@/lib/types';
const num=(v:unknown)=>Number(v||0);const str=(v:unknown)=>String(v||'');
const cleanDokumen=(v:unknown):{name:string;url:string;type:string;size:number}[]=>Array.isArray(v)?v.filter((x:any)=>x&&x.url):[];
const cleanPihak=(v:unknown):PihakAkta[]=>Array.isArray(v)?v.slice(0,6).map((x:any)=>({nama:str(x?.nama).trim(),nik:str(x?.nik).replace(/\D/g,'').slice(0,16),npwp:str(x?.npwp).trim(),scanIdentitas:cleanDokumen(x?.scanIdentitas)})).filter(x=>x.nama||x.nik||x.npwp||(x.scanIdentitas&&x.scanIdentitas.length)):[];
const cleanTtd=(v:unknown):TandaTanganDigital[]=>Array.isArray(v)?v.filter((x:any)=>x&&x.dataUrl).map((x:any)=>({nama:str(x.nama),peran:str(x.peran),dataUrl:str(x.dataUrl),tanggal:str(x.tanggal)})):[];
function normalize(b:any,id?:string):Akta{const pihak=cleanPihak(b.pihak);const fallback=pihak.length?pihak:[{nama:str(b.namaPihak),nik:str(b.nik),npwp:str(b.npwp)}].filter(x=>x.nama||x.nik||x.npwp);return {id:id||randomUUID(),nomorAkta:str(b.nomorAkta),tanggal:str(b.tanggal),kategori:b.kategori==='PPAT'?'PPAT':'NOTARIS',jenisAkta:str(b.jenisAkta),namaNotaris:str(b.namaNotaris),pihak:fallback,namaPihak:fallback.map(x=>x.nama).filter(Boolean).join('; '),nik:fallback.map(x=>x.nik).filter(Boolean).join('; '),npwp:fallback.map(x=>x.npwp).filter(Boolean).join('; '),alamat:str(b.alamat),nomorSertifikat:str(b.nomorSertifikat),jenisHak:str(b.jenisHak),luasTanah:str(b.luasTanah),nilaiTransaksi:num(b.nilaiTransaksi),nopPbb:str(b.nopPbb),njop:num(b.njop),tanggalSsp:str(b.tanggalSsp),sspPph:num(b.sspPph),tanggalBphtb:str(b.tanggalBphtb),bphtb:num(b.bphtb),honorarium:num(b.honorarium),status:b.status||'Draft',catatan:str(b.catatan),detail:typeof b.detail==='object'?b.detail:{},dokumen:cleanDokumen(b.dokumen),fotoTtdKlien:cleanDokumen(b.fotoTtdKlien),fotoTtdNotaris:cleanDokumen(b.fotoTtdNotaris),minuta:cleanDokumen(b.minuta),tandaTanganDigital:cleanTtd(b.tandaTanganDigital)}}

export async function GET(){
 try{
  return NextResponse.json(await listAkta());
 }catch(error){
  return errorResponse('AKTA GET ERROR',error,'Gagal memuat data akta.');
 }
}

export async function POST(req:Request){
 try{
  const body=await readJsonBody(req);
  const data=await listAkta();
  const a=normalize(body);
  if(!a.pihak.length||!a.pihak[0].nama)throw new AppError('Minimal nama pihak pertama wajib diisi',400);
  data.unshift(a);
  await saveAkta(data);
  return NextResponse.json({id:a.id},{status:201});
 }catch(error){
  return errorResponse('AKTA POST ERROR',error,'Gagal menyimpan akta.');
 }
}

export async function PUT(req:Request){
 try{
  const id=new URL(req.url).searchParams.get('id');
  if(!id)throw new AppError('ID wajib',400);
  const body=await readJsonBody(req);
  const data=await listAkta();
  const i=data.findIndex(x=>x.id===id);
  if(i<0)throw new AppError('Data tidak ditemukan',404);
  const a=normalize(body,id);
  if(!a.pihak.length||!a.pihak[0].nama)throw new AppError('Minimal nama pihak pertama wajib diisi',400);
  data[i]=a;
  await saveAkta(data);
  return NextResponse.json({id});
 }catch(error){
  return errorResponse('AKTA PUT ERROR',error,'Gagal memperbarui akta.');
 }
}

export async function DELETE(req:Request){
 try{
  const id=new URL(req.url).searchParams.get('id');
  if(!id)throw new AppError('ID wajib',400);
  const data=await listAkta();
  if(!data.some(x=>x.id===id))throw new AppError('Data tidak ditemukan',404);
  await saveAkta(data.filter(x=>x.id!==id));
  return NextResponse.json({ok:true});
 }catch(error){
  return errorResponse('AKTA DELETE ERROR',error,'Gagal menghapus akta.');
 }
}
