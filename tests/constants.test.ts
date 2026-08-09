import { describe, expect, it } from "vitest";
import { AKTA_NOTARIS, AKTA_PPAT, DYNAMIC_FIELDS, rupiah } from "@/lib/constants";

const normalize = (value: string) => value.replace(/\u00a0/g, " ");

describe("rupiah", () => {
  it("formats a value as IDR without decimals", () => {
    expect(normalize(rupiah(1_500_000))).toBe("Rp 1.500.000");
  });

  it("rounds fractional rupiah away", () => {
    expect(normalize(rupiah(1000.6))).toBe("Rp 1.001");
  });

  it("renders 0 for falsy input", () => {
    expect(normalize(rupiah(0))).toBe("Rp 0");
    expect(normalize(rupiah(NaN))).toBe("Rp 0");
    expect(normalize(rupiah(undefined as unknown as number))).toBe("Rp 0");
  });

  it("keeps the sign for negative values", () => {
    expect(normalize(rupiah(-2500))).toContain("2.500");
    expect(normalize(rupiah(-2500))).toContain("-");
  });
});

describe("akta catalogue", () => {
  it("exposes 15 jenis akta notaris and 7 jenis akta PPAT", () => {
    expect(AKTA_NOTARIS).toHaveLength(15);
    expect(AKTA_PPAT).toHaveLength(7);
  });

  it("has no duplicates within each category", () => {
    expect(new Set(AKTA_NOTARIS).size).toBe(AKTA_NOTARIS.length);
    expect(new Set(AKTA_PPAT).size).toBe(AKTA_PPAT.length);
  });

  it("only declares dynamic fields for known jenis akta", () => {
    const known = new Set([...AKTA_NOTARIS, ...AKTA_PPAT]);
    for (const jenis of Object.keys(DYNAMIC_FIELDS)) {
      expect(known.has(jenis), `${jenis} is not a known jenis akta`).toBe(true);
    }
  });

  it("declares non-empty, unique field lists", () => {
    for (const [jenis, fields] of Object.entries(DYNAMIC_FIELDS)) {
      expect(fields.length, jenis).toBeGreaterThan(0);
      expect(new Set(fields).size, jenis).toBe(fields.length);
    }
  });
});
