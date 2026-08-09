import AppShell from "@/components/AppShell";
import { listAkta } from "@/lib/store";
import { rupiah } from "@/lib/constants";
import { pihakNama } from "@/lib/akta";

export const dynamic = "force-dynamic";

export default async function Page() {
  const data = await listAkta();
  const total = data.reduce((s, x) => s + (Number(x.honorarium) || 0), 0);
  return (
    <AppShell>
      <section className="hero">
        <div>
          <h1>Honorarium</h1>
          <div>Rekap honorarium seluruh akta Notaris dan PPAT — otomatis diperbarui setiap ada input akta baru.</div>
        </div>
        <a className="btn btn-primary no-print" href="/api/export/honorarium">Unduh Excel Honorarium</a>
      </section>
      <div className="grid stats">
        <div className="card stat">Total Honorarium<b style={{ fontSize: 20 }}>{rupiah(total)}</b></div>
        <div className="card stat">Rata-rata Akta<b style={{ fontSize: 20 }}>{rupiah(data.length ? total / data.length : 0)}</b></div>
      </div>
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th>Nomor</th><th>Jenis</th><th>Pihak</th><th>Kategori</th><th>Honorarium</th></tr></thead>
          <tbody>
            {data.map((x) => (
              <tr key={x.id}>
                <td>{x.nomorAkta}</td>
                <td>{x.jenisAkta}</td>
                <td>{pihakNama(x)}</td>
                <td>{x.kategori}</td>
                <td><b>{rupiah(x.honorarium)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
