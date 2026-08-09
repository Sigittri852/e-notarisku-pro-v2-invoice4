/** Format tanggal ISO (YYYY-MM-DD) untuk nilai input date dan penamaan berkas. */
export const isoDate = (date: Date = new Date()) => date.toISOString().slice(0, 10);

export const isoDateIn = (days: number, from: Date = new Date()) =>
  isoDate(new Date(from.getTime() + days * 86400000));

/** Nama berkas unduhan tanpa karakter yang bermasalah pada header Content-Disposition. */
export const downloadSlug = (name: string, fallback = "dokumen") =>
  name.replace(/[^a-zA-Z0-9_-]/g, "_") || fallback;

/** Format kolom nominal Rupiah pada worksheet Excel. */
export const RUPIAH_NUM_FMT = '"Rp" #,##0';
