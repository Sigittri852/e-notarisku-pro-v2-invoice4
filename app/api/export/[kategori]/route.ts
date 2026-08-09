import {NextResponse} from 'next/server';import ExcelJS from 'exceljs';import path from 'path';import {listAkta} from '@/lib/store';import {AppError} from '@/lib/errors';import {errorResponse} from '@/lib/api-error';
export const runtime='nodejs';
const row=18;
export async function GET(_req:Request,{params}:{params:Promise<{kategori:string}>}){
 try{
  const {kategori}=await params;const cat=kategori.toUpperCase()==='PPAT'?'PPAT':'NOTARIS';const wb=new ExcelJS.Workbook();const file=path.join(process.cwd(),'public','templates',cat==='PPAT'?'DRAFT-LAP-PPAT.xlsx':'DRAFT-LAP-NOTARIS.xlsx');
  try{await wb.xlsx.readFile(file)}catch(error){console.error('EXPORT TEMPLATE READ ERROR:',error);throw new AppError(`Template laporan ${cat} tidak dapat dibaca (${file}).`,500)}
  const ws=wb.worksheets[0];
  if(!ws)throw new AppError(`Template laporan ${cat} tidak memiliki lembar kerja.`,500);
  const data=(await listAkta()).filter(x=>x.kategori===cat);data.forEach((x,i)=>{const r=row+i;ws.getCell(`B${r}`).value=i+1;ws.getCell(`C${r}`).value=x.namaNotaris;ws.getCell(`D${r}`).value=x.nomorAkta;ws.getCell(`E${r}`).value=x.tanggal?new Date(x.tanggal):'';const pihak=x.pihak?.length?x.pihak:[{nama:x.namaPihak,nik:x.nik,npwp:x.npwp}];ws.getCell(`F${r}`).value=pihak.map(p=>[p.nik,p.npwp].filter(Boolean).join(' / ')).filter(Boolean).join('; ');ws.getCell(`G${r}`).value=pihak.map(p=>p.nama).filter(Boolean).join('; ');ws.getCell(`H${r}`).value=x.alamat;ws.getCell(`J${r}`).value=x.nilaiTransaksi;ws.getCell(`K${r}`).value=Number(x.luasTanah||0);ws.getCell(`L${r}`).value=x.status;ws.getCell(`M${r}`).value=x.nilaiTransaksi;ws.getCell(`N${r}`).value=x.nopPbb;ws.getCell(`O${r}`).value=x.njop;ws.getCell(`P${r}`).value=x.tanggalSsp?new Date(x.tanggalSsp):'';ws.getCell(`Q${r}`).value=x.sspPph;ws.getCell(`R${r}`).value=x.tanggalBphtb?new Date(x.tanggalBphtb):'';ws.getCell(`S${r}`).value=x.bphtb;ws.getCell(`T${r}`).value=x.catatan});["J","M","O","Q","S"].forEach((col)=>{ ws.getColumn(col).numFmt = '"Rp" #,##0'; });
  const buf=await wb.xlsx.writeBuffer();return new NextResponse(buf as BodyInit,{headers:{'Content-Type':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','Content-Disposition':`attachment; filename="LAPORAN-${cat}-${new Date().toISOString().slice(0,10)}.xlsx"`}});
 }catch(error){
  return errorResponse('EXPORT LAPORAN ERROR',error,'Gagal membuat laporan Excel.');
 }
}
