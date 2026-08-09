import { promises as fs } from "fs";
import os from "os";
import path from "path";
import bcrypt from "bcryptjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type UserStore = typeof import("@/lib/user-store");

let dir: string;
let userStore: UserStore;

const usersFile = () => path.join(dir, "data", "users.json");

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "user-store-"));
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  vi.resetModules();
  userStore = await import("@/lib/user-store");
});

afterEach(async () => {
  vi.restoreAllMocks();
  await fs.rm(dir, { recursive: true, force: true });
});

describe("listUsers", () => {
  it("seeds the default admin and staff accounts on first read", async () => {
    const users = await userStore.listUsers();
    expect(users.map((u) => u.email)).toEqual(["admin@notaris.local", "staf@notaris.local"]);
    expect(users.map((u) => u.role)).toEqual(["SUPER_ADMIN", "STAFF"]);
  });

  it("stores the seeded passwords as bcrypt hashes", async () => {
    const [admin, staff] = await userStore.listUsers();
    expect(admin.passwordHash).not.toBe("admin123");
    expect(bcrypt.compareSync("admin123", admin.passwordHash)).toBe(true);
    expect(bcrypt.compareSync("staff123", staff.passwordHash)).toBe(true);
  });

  it("does not re-seed when the file already exists", async () => {
    await userStore.saveUsers([]);
    await expect(userStore.listUsers()).resolves.toEqual([]);
  });

  it("returns an empty list for malformed or non-array content", async () => {
    await fs.mkdir(path.dirname(usersFile()), { recursive: true });
    await fs.writeFile(usersFile(), "{not json");
    await expect(userStore.listUsers()).resolves.toEqual([]);

    await fs.writeFile(usersFile(), JSON.stringify({ email: "x" }));
    await expect(userStore.listUsers()).resolves.toEqual([]);
  });
});

describe("toPublicUser", () => {
  it("strips the password hash", async () => {
    const [admin] = await userStore.listUsers();
    const publicUser = userStore.toPublicUser(admin);
    expect(publicUser).not.toHaveProperty("passwordHash");
    expect(publicUser.email).toBe(admin.email);
  });
});

describe("createUser", () => {
  it("normalizes the email, trims the name and hashes the password", async () => {
    const user = await userStore.createUser({
      nama: "  Budi Santoso  ",
      email: "  Budi@Notaris.Local ",
      role: "NOTARIS_PPAT",
      aktif: true,
      password: "rahasia",
    });

    expect(user.nama).toBe("Budi Santoso");
    expect(user.email).toBe("budi@notaris.local");
    expect(bcrypt.compareSync("rahasia", user.passwordHash)).toBe(true);
    expect(user.createdAt).toBe(user.updatedAt);
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("persists the new user", async () => {
    await userStore.createUser({ nama: "Budi", email: "budi@notaris.local", role: "STAFF", aktif: true, password: "rahasia" });
    const emails = (await userStore.listUsers()).map((u) => u.email);
    expect(emails).toContain("budi@notaris.local");
  });

  it("rejects a duplicate email regardless of casing", async () => {
    await expect(
      userStore.createUser({ nama: "Dobel", email: "ADMIN@notaris.local", role: "STAFF", aktif: true, password: "rahasia" }),
    ).rejects.toThrow("Email sudah digunakan.");

    expect(await userStore.listUsers()).toHaveLength(2);
  });
});

describe("updateUser", () => {
  it("updates fields and keeps the existing password when none is supplied", async () => {
    const [admin] = await userStore.listUsers();
    const updated = await userStore.updateUser(admin.id, {
      nama: " Admin Baru ",
      email: "ADMIN@notaris.local",
      role: "NOTARIS_PPAT",
      aktif: false,
      });

    expect(updated.nama).toBe("Admin Baru");
    expect(updated.email).toBe("admin@notaris.local");
    expect(updated.role).toBe("NOTARIS_PPAT");
    expect(updated.aktif).toBe(false);
    expect(updated.passwordHash).toBe(admin.passwordHash);
    expect(updated.createdAt).toBe(admin.createdAt);
  });

  it("re-hashes the password when a new one is supplied", async () => {
    const [admin] = await userStore.listUsers();
    const updated = await userStore.updateUser(admin.id, {
      nama: admin.nama,
      email: admin.email,
      role: admin.role,
      aktif: admin.aktif,
      password: "passwordbaru",
    });

    expect(updated.passwordHash).not.toBe(admin.passwordHash);
    expect(bcrypt.compareSync("passwordbaru", updated.passwordHash)).toBe(true);
  });

  it("persists the update", async () => {
    const [admin] = await userStore.listUsers();
    await userStore.updateUser(admin.id, { nama: "Admin Baru", email: admin.email, role: admin.role, aktif: admin.aktif });
    const stored = (await userStore.listUsers()).find((u) => u.id === admin.id);
    expect(stored?.nama).toBe("Admin Baru");
  });

  it("throws for an unknown id", async () => {
    await expect(
      userStore.updateUser("tidak-ada", { nama: "X", email: "x@notaris.local", role: "STAFF", aktif: true }),
    ).rejects.toThrow("Pengguna tidak ditemukan.");
  });

  it("throws when the email belongs to another user", async () => {
    const [admin, staff] = await userStore.listUsers();
    await expect(
      userStore.updateUser(admin.id, { nama: admin.nama, email: staff.email, role: admin.role, aktif: true }),
    ).rejects.toThrow("Email sudah digunakan.");
  });
});
