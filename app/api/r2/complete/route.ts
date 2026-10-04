import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { r2, settings } from "@/lib/r2/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
export async function POST(request: Request) {
  try {
    const { video_id } = z
      .object({ video_id: z.uuid() })
      .parse(await request.json());
    const c = await createClient();
    const {
      data: { user },
    } = await c.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: v } = await c
      .from("videos")
      .select("*")
      .eq("id", video_id)
      .single();
    if (!v?.r2_object_key || v.status !== "uploading")
      throw new Error("No upload reservation");
    const config = settings();
    const head = await r2(config).send(
      new HeadObjectCommand({ Bucket: config.bucket, Key: v.r2_object_key }),
    );
    if (head.ContentLength !== v.file_size_bytes)
      throw new Error("Uploaded size mismatch");
    const { error } = await c
      .from("videos")
      .update({ status: "ready", storage_mode: "r2" })
      .eq("id", v.id);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ready: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }
}
