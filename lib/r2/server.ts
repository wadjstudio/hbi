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
      limit: z.coerce
        .number()
        .int()
        .positive()
        .max(10 * 1024 ** 3)
        .default(1024 ** 3),
    })
    .parse({
      account: process.env.R2_ACCOUNT_ID,
      bucket: process.env.R2_BUCKET_NAME,
      access: process.env.R2_ACCESS_KEY_ID,
      secret: process.env.R2_SECRET_ACCESS_KEY,
      limit: process.env.R2_MAX_SHARED_BYTES,
    });
}
export function r2(c: ReturnType<typeof settings>) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${c.account}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: c.access, secretAccessKey: c.secret },
  });
}
