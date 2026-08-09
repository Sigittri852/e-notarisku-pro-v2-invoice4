/** Error yang aman ditampilkan ke pengguna beserta status HTTP-nya. */
export class AppError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
