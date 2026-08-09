"use client";

import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { fetchJson } from "@/lib/fetch-json";
import { errorMessage } from "@/lib/errors";

type UserRole = "SUPER_ADMIN" | "NOTARIS_PPAT" | "STAFF";
type UserItem = {
  id: string;
  nama: string;
  email: string;
  role: UserRole;
  aktif: boolean;
};

type FormState = {
  nama: string;
  email: string;
  role: UserRole;
  aktif: boolean;
  password: string;
};

const emptyForm: FormState = {
  nama: "",
  email: "",
  role: "STAFF",
  aktif: true,
  password: "",
};

const roleLabel: Record<UserRole, string> = {
  SUPER_ADMIN: "SUPER ADMIN",
  NOTARIS_PPAT: "NOTARIS / PPAT",
  STAFF: "STAFF",
};

export default function Page() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");

  async function loadUsers() {
    setLoading(true);
    try {
      setUsers(await fetchJson<UserItem[]>("/api/pengguna", { cache: "no-store" }));
    } catch (err) {
      setError(errorMessage(err, "Gagal mengambil data pengguna."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(user: UserItem) {
    setEditingId(user.id);
    setForm({
      nama: user.nama,
      email: user.email,
      role: user.role,
      aktif: user.aktif,
      password: "",
    });
    setError("");
    setModalOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editingId ? `/api/pengguna/${editingId}` : "/api/pengguna";
      await fetchJson(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setModalOpen(false);
      await loadUsers();
    } catch (err) {
      setError(errorMessage(err, "Data gagal disimpan."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <section className="hero compact">
        <div>
          <h1>Manajemen Pengguna</h1>
          <p>Kelola akun Admin, Notaris/PPAT, dan Staf.</p>
        </div>
        <div className="hero-icon">👥</div>
      </section>

      <div className="card">
        <div className="actions pengguna-toolbar">
          <button type="button" className="btn btn-primary" onClick={openAdd}>
            + Tambah Pengguna
          </button>
          {error && !modalOpen ? <span className="form-error">{error}</span> : null}
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Peran</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="muted">Memuat data pengguna...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="muted">Belum ada pengguna.</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.nama}</td>
                    <td>{user.email}</td>
                    <td>{roleLabel[user.role]}</td>
                    <td>
                      <span className={`badge ${user.aktif ? "ok" : "gray"}`}>
                        {user.aktif ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="btn btn-small" onClick={() => openEdit(user)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen ? (
        <div className="modal-backdrop" onMouseDown={() => !saving && setModalOpen(false)}>
          <div className="modal-card" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>{editingId ? "Edit Pengguna" : "Tambah Pengguna"}</h2>
                <p>{editingId ? "Perbarui data pengguna yang dipilih." : "Isi data akun pengguna baru."}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setModalOpen(false)} disabled={saving}>×</button>
            </div>

            <form onSubmit={submit} className="modal-form">
              <div className="field">
                <label>Nama Lengkap</label>
                <input
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  placeholder="Nama pengguna"
                  required
                />
              </div>

              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="nama@email.com"
                  required
                />
              </div>

              <div className="field">
                <label>Peran</label>
                <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
                  <option value="SUPER_ADMIN">SUPER ADMIN</option>
                  <option value="NOTARIS_PPAT">NOTARIS / PPAT</option>
                  <option value="STAFF">STAFF</option>
                </select>
              </div>

              <div className="field">
                <label>{editingId ? "Password Baru" : "Password"}</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={editingId ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"}
                  required={!editingId}
                  minLength={form.password ? 6 : undefined}
                />
              </div>

              <label className="status-toggle">
                <input
                  type="checkbox"
                  checked={form.aktif}
                  onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
                />
                <span>Akun aktif</span>
              </label>

              {error ? <div className="form-error">{error}</div> : null}

              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setModalOpen(false)} disabled={saving}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Pengguna"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
