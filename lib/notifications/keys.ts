export function normalizeEmail(email: string | null | undefined): string | null {
  if (typeof email !== "string") return null;
  const v = email.trim().toLowerCase();
  return v || null;
}
