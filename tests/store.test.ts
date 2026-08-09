import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Akta } from "@/lib/types";

type Store = typeof import("@/lib/store");

let dir: string;
let store: Store;

const akta = (id: string, nomorAkta: string) => ({ id, nomorAkta } as unknown as Akta);

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "akta-store-"));
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  vi.resetModules();
  store = await import("@/lib/store");
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(dir, { recursive: true, force: true });
});

describe("listAkta", () => {
  it("returns an empty list when the data file does not exist", async () => {
    await expect(store.listAkta()).resolves.toEqual([]);
  });

  it("returns an empty list when the data file is not valid JSON", async () => {
    await fs.mkdir(path.join(dir, "data"), { recursive: true });
    await fs.writeFile(path.join(dir, "data", "akta.json"), "{not json");
    await expect(store.listAkta()).resolves.toEqual([]);
  });

  it("reads back what saveAkta wrote", async () => {
    const data = [akta("a", "1/2026"), akta("b", "2/2026")];
    await store.saveAkta(data);
    await expect(store.listAkta()).resolves.toEqual(data);
  });
});

describe("saveAkta", () => {
  it("creates the data directory when it is missing", async () => {
    await store.saveAkta([]);
    await expect(fs.readFile(path.join(dir, "data", "akta.json"), "utf8")).resolves.toBe("[]");
  });

  it("replaces the previous content instead of appending", async () => {
    await store.saveAkta([akta("a", "1/2026"), akta("b", "2/2026")]);
    await store.saveAkta([akta("c", "3/2026")]);
    await expect(store.listAkta()).resolves.toEqual([akta("c", "3/2026")]);
  });
});

describe("getAkta", () => {
  it("finds an akta by id", async () => {
    await store.saveAkta([akta("a", "1/2026"), akta("b", "2/2026")]);
    await expect(store.getAkta("b")).resolves.toEqual(akta("b", "2/2026"));
  });

  it("resolves to undefined for an unknown id", async () => {
    await store.saveAkta([akta("a", "1/2026")]);
    await expect(store.getAkta("zzz")).resolves.toBeUndefined();
  });
});
