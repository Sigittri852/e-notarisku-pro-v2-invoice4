/** Aturan upload berkas yang dipakai bersama oleh route /api/upload dan /api/blob. */
export const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;
export const MAX_UPLOAD_FILES = 10;

export const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

export function safeUploadName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\- ]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

/** Pesan kesalahan validasi berkas, atau null bila berkas dapat diterima. */
export function uploadFileError(file: File) {
  if (file.size > MAX_UPLOAD_SIZE) {
    return `File "${file.name}" terlalu besar. Maksimal 25 MB.`;
  }
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return `Jenis file "${file.name}" tidak diperbolehkan.`;
  }
  return null;
}

export const formFiles = (form: FormData, field = "files") =>
  form.getAll(field).filter((value): value is File => value instanceof File);
