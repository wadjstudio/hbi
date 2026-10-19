import { z } from "zod";
import { identityImageSource } from "@/lib/brand/identity-image";

export const accountProfileInput = z.object({
  name: z.string().trim().min(1).max(80),
  avatarUrl: z
    .string()
    .trim()
    .max(8192)
    .refine((value) => !value || Boolean(identityImageSource(value))),
});
