import "server-only";
import { S3Client } from "@aws-sdk/client-s3";
import { z } from "zod";
export function settings() {
  return z
    .object({
      account: z.string().min(1),
      bucket: z.string().min(1),
      access: z.string().min(1),
      secret: z.string().min(1),
    })
    .parse({
      account: process.env.R2_ACCOUNT_ID,
      bucket: process.env.R2_BUCKET_NAME,
      access: process.env.R2_ACCESS_KEY_ID,
      secret: process.env.R2_SECRET_ACCESS_KEY,
    });
}
export function r2(c: ReturnType<typeof settings>) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${c.account}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: c.access, secretAccessKey: c.secret },
  });
}
export function assertR2Request(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    const allowed = new Set<string>([new URL(request.url).origin]);
    if (process.env.NEXT_PUBLIC_APP_URL) {
      try {
        allowed.add(new URL(process.env.NEXT_PUBLIC_APP_URL).origin);
      } catch {
        /* ignore invalid env URL */
      }
    }
    if (!allowed.has(origin))
      throw new Error("Cross-origin request rejected");
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType && !contentType.toLowerCase().includes("application/json"))
    throw new Error("Content-Type must be application/json");
}
