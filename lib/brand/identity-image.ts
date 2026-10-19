/** Portable image references only; browser rendering never proxies arbitrary URLs through the server. */
export const identityImageSource = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const source = value.trim();
  if (
    !source ||
    source.length > 8192 ||
    /[\\\u0000-\u001f\u007f]/u.test(source)
  )
    return null;
  try {
    if (source.startsWith("/") && !source.startsWith("//")) {
      const parsed = new URL(source, "https://sesen.invalid");
      return parsed.origin === "https://sesen.invalid" ? source : null;
    }
    const parsed = new URL(source);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password
      ? parsed.href
      : null;
  } catch {
    return null;
  }
};
