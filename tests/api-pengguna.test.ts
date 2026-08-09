import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StoredUser } from "@/lib/user-store";

const listUsers = vi.fn<() => Promise<StoredUser[]>>();
const createUser = vi.fn();
const updateUser = vi.fn();

vi.mock("@/lib/user-store", async () => {
  const actual = await vi.importActual<typeof import("@/lib/user-store")>("@/lib/user-store");
  return {
    ...actual,
    listUsers: () => listUsers(),
    createUser: (input: unknown) => createUser(input),
    updateUser: (id: string, input: unknown) => updateUser(id, input),
  };
});

const collectionRoute = await import("@/app/api/pengguna/route");
const itemRoute = await import("@/app/api/pengguna/[id]/route");

const user = (over: Partial<StoredUser> = {}): StoredUser => ({
  id: "u-1",
  nama: "Budi",
  email: "budi@notaris.local",
  role: "STAFF",
  aktif: true,
  passwordHash: "hash-rahasia",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  ...over,
});

const body = (over: Record<string, unknown> = {}) => ({
  nama: "Budi",
  email: "budi@notaris.local",
  password: "rahasia",
  role: "STAFF",
  ...over,
});

const post = (payload: unknown) =>
  collectionRoute.POST(new Request("http://localhost/api/pengguna", { method: "POST", body: JSON.stringify(payload) }));

const put = (payload: unknown, id = "u-1") =>
  itemRoute.PUT(new Request(`http://localhost/api/pengguna/${id}`, { method: "PUT", body: JSON.stringify(payload) }), {
    params: Promise.resolve({ id }),
  });

beforeEach(() => {
  listUsers.mockResolvedValue([user()]);
  createUser.mockImplementation(async (input: { nama: string; email: string; role: string; aktif: boolean }) =>
    user({ nama: input.nama, email: input.email, role: input.role as StoredUser["role"], aktif: input.aktif }),
  );
  updateUser.mockImplementation(async (id: string, input: { nama: string; email: string }) =>
    user({ id, nama: input.nama, email: input.email }),
  );
});

afterEach(() => vi.clearAllMocks());

describe("GET /api/pengguna", () => {
  it("never exposes password hashes", async () => {
    const payload = await (await collectionRoute.GET()).json();
    expect(payload).toEqual([
      { id: "u-1", nama: "Budi", email: "budi@notaris.local", role: "STAFF", aktif: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
    ]);
  });
});

describe("POST /api/pengguna", () => {
  it("creates a user and returns it without the password hash", async () => {
    const res = await post(body({ nama: "  Budi  ", email: " budi@notaris.local " }));

    expect(res.status).toBe(201);
    expect(createUser).toHaveBeenCalledWith({ nama: "Budi", email: "budi@notaris.local", password: "rahasia", role: "STAFF", aktif: true });
    await expect(res.json()).resolves.not.toHaveProperty("passwordHash");
  });

  it("defaults the role to STAFF and aktif to true", async () => {
    await post({ nama: "Budi", email: "budi@notaris.local", password: "rahasia" });
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ role: "STAFF", aktif: true }));
  });

  it("treats aktif false as the only way to deactivate", async () => {
    await post(body({ aktif: false }));
    expect(createUser).toHaveBeenCalledWith(expect.objectContaining({ aktif: false }));
  });

  it("rejects missing nama, email or password", async () => {
    for (const payload of [body({ nama: "   " }), body({ email: "" }), body({ password: "" })]) {
      const res = await post(payload);
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ message: "Nama, email, dan password wajib diisi." });
    }
    expect(createUser).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    const res = await post(body({ email: "budi@local" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ message: "Format email tidak valid." });
  });

  it("rejects a password shorter than 6 characters", async () => {
    const res = await post(body({ password: "12345" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ message: "Password minimal 6 karakter." });
  });

  it("rejects an unknown role", async () => {
    const res = await post(body({ role: "OWNER" }));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ message: "Peran tidak valid." });
  });

  it("surfaces store errors as 400", async () => {
    createUser.mockRejectedValue(new Error("Email sudah digunakan."));
    const res = await post(body());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ message: "Email sudah digunakan." });
  });

  it("falls back to a generic message for non-Error failures", async () => {
    createUser.mockRejectedValue("boom");
    const res = await post(body());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ message: "Gagal menambah pengguna." });
  });
});

describe("PUT /api/pengguna/[id]", () => {
  it("updates the user and omits the password when it is blank", async () => {
    const res = await put(body({ password: "" }));

    expect(res.status).toBe(200);
    expect(updateUser).toHaveBeenCalledWith("u-1", { nama: "Budi", email: "budi@notaris.local", role: "STAFF", aktif: true, password: undefined });
    await expect(res.json()).resolves.not.toHaveProperty("passwordHash");
  });

  it("passes a new password through", async () => {
    await put(body({ password: "passwordbaru" }));
    expect(updateUser).toHaveBeenCalledWith("u-1", expect.objectContaining({ password: "passwordbaru" }));
  });

  it("rejects missing nama or email", async () => {
    for (const payload of [body({ nama: " " }), body({ email: "" })]) {
      const res = await put(payload);
      expect(res.status).toBe(400);
      await expect(res.json()).resolves.toEqual({ message: "Nama dan email wajib diisi." });
    }
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("rejects a malformed email, a short new password and an unknown role", async () => {
    await expect((await put(body({ email: "budi@local" }))).json()).resolves.toEqual({ message: "Format email tidak valid." });
    await expect((await put(body({ password: "123" }))).json()).resolves.toEqual({ message: "Password baru minimal 6 karakter." });
    await expect((await put(body({ role: "OWNER" }))).json()).resolves.toEqual({ message: "Peran tidak valid." });
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("maps a not-found store error to 404", async () => {
    updateUser.mockRejectedValue(new Error("Pengguna tidak ditemukan."));
    const res = await put(body(), "hilang");
    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ message: "Pengguna tidak ditemukan." });
  });

  it("maps other store errors to 400", async () => {
    updateUser.mockRejectedValue(new Error("Email sudah digunakan."));
    expect((await put(body())).status).toBe(400);
  });

  it("falls back to a generic message for non-Error failures", async () => {
    updateUser.mockRejectedValue("boom");
    const res = await put(body());
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ message: "Gagal mengubah pengguna." });
  });
});
