"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {LayoutDashboard,FileText,PlusCircle,WalletCards,Receipt,BarChart3,Building2,KeyRound,Users,LogOut,Scale} from "lucide-react";
const items=[["/dashboard","Dashboard",LayoutDashboard],["/akta","Daftar Akta",FileText],["/akta/baru","Input Akta Baru",PlusCircle],["/honorarium","Honorarium",WalletCards],["/invoice","Invoice & Tagihan",Receipt],["/laporan","Laporan & Excel",BarChart3],["/profil-kantor","Profil Kantor",Building2],["/pengguna","Pengguna",Users],["/ganti-password","Ganti Password",KeyRound]] as const;

type Me = { nama: string; email: string };

export default function Sidebar(){
  const p=usePathname();
  const router=useRouter();
  const [me,setMe]=useState<Me|null>(null);

  useEffect(()=>{
    let active=true;
    fetch("/api/auth/me",{cache:"no-store"})
      .then(r=>r.ok?r.json():null)
      .then(d=>{if(active&&d)setMe({nama:d.nama,email:d.email})})
      .catch(()=>{});
    return()=>{active=false};
  },[]);

  async function logout(){
    await fetch("/api/auth/logout",{method:"POST"});
    router.replace("/login");
    router.refresh();
  }

  return <aside className="sidebar"><div className="brand"><div className="brand-logo"><Scale size={34}/></div><div><b>e-NotarisKu Pro</b><span>Notaris & PPAT</span></div></div><nav>{items.map(([href,label,Icon])=><Link key={href} href={href} className={p.startsWith(href)?"active":""}><Icon size={20}/>{label}</Link>)}<button type="button" onClick={logout} className="nav-logout"><LogOut size={20}/>Keluar</button></nav><div className="user-card"><b>{me?.nama??"—"}</b><span>{me?.email??""}</span><small>● Online</small></div></aside>;
}
