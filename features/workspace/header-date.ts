import { z } from "zod";
const instant = z.iso.datetime({ offset: true });

// Header dates use an explicit zone; changing devices must not silently change the displayed day.
export const headerDate = (value: unknown, language: string) => {
  const parsed = instant.safeParse(value);
  if (!parsed.success) return null;
  return {
    iso: parsed.data,
    label: new Intl.DateTimeFormat(language === "ar" ? "ar-EG" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(parsed.data)),
  };
};
