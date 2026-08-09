import type { Akta, PihakAkta } from "./types";

/** Bentuk minimal data akta (baru maupun lama) yang dibutuhkan untuk membaca data pihak. */
export type AktaPihakSource = Partial<Pick<Akta, "pihak" | "namaPihak" | "nik" | "npwp">>;

export const hasPihakData = (pihak: Partial<PihakAkta>) =>
  Boolean(pihak.nama || pihak.nik || pihak.npwp || pihak.scanIdentitas?.length);

/**
 * Daftar pihak akta dengan fallback ke field lama (namaPihak/nik/npwp) agar data
 * dan template lama tetap kompatibel.
 */
export function pihakList(akta?: AktaPihakSource): PihakAkta[] {
  if (akta?.pihak?.length) return akta.pihak;
  return [
    {
      nama: akta?.namaPihak || "",
      nik: akta?.nik || "",
      npwp: akta?.npwp || "",
    },
  ];
}

const joinField = (akta: AktaPihakSource | undefined, key: keyof PihakAkta, separator: string) =>
  pihakList(akta)
    .map((pihak) => pihak[key])
    .filter((value): value is string => Boolean(value))
    .join(separator);

export const pihakNama = (akta?: AktaPihakSource, separator = ", ") => joinField(akta, "nama", separator);
export const pihakNik = (akta?: AktaPihakSource, separator = ", ") => joinField(akta, "nik", separator);
export const pihakNpwp = (akta?: AktaPihakSource, separator = ", ") => joinField(akta, "npwp", separator);
