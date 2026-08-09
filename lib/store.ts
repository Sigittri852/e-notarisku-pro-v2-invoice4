import { promises as fs } from "fs";
import path from "path";
import type { Akta } from "./types";
import { AppError } from "./errors";

const file = path.join(process.cwd(), "data", "akta.json");

function isNotFound(error: unknown) {
  return (error as NodeJS.ErrnoException)?.code === "ENOENT";
}

export async function listAkta(): Promise<Akta[]> {
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error) {
    if (isNotFound(error)) return [];
    console.error("AKTA STORE READ ERROR:", error);
    throw new AppError("Gagal membaca data akta.", 500);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AppError(
      `Data akta rusak dan tidak dapat dibaca (${file}). Perbaiki atau pulihkan berkas tersebut sebelum menyimpan data baru.`,
      500,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new AppError(`Format data akta tidak valid (${file}): harus berupa array.`, 500);
  }
  return parsed as Akta[];
}

export async function saveAkta(data: Akta[]) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2));
  await fs.rename(tmp, file);
}

export async function getAkta(id: string) {
  return (await listAkta()).find((x) => x.id === id);
}
