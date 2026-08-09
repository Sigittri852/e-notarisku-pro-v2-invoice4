/** Helper normalisasi nilai dari body JSON / form yang dipakai bersama oleh API route. */
export const str = (value: unknown) => String(value ?? "");
export const num = (value: unknown) => Number(value || 0);
export const nonNegative = (value: unknown) => Math.max(0, num(value));
export const digits = (value: unknown, maxLength?: number) => {
  const onlyDigits = str(value).replace(/\D/g, "");
  return typeof maxLength === "number" ? onlyDigits.slice(0, maxLength) : onlyDigits;
};
