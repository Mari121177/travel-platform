export function safeNextPath(
  value: string | null | undefined,
  origin: string,
): string | null {
  if (!value) return null;
  try {
    const target = new URL(value, origin);
    if (target.origin !== origin) return null;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return null;
  }
}
