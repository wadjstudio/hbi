import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { r2, settings } from "@/lib/r2/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
    const { data: video } = await c
      .from("videos")
      .select("r2_object_key,status")
      .eq("id", video_id)
      .single();
    if (!video?.r2_object_key || video.status !== "ready")
      return NextResponse.json(
        { error: "Source unavailable" },
        { status: 404 },
      );
    const config = settings();
    return NextResponse.json({
      url: await getSignedUrl(
        r2(config),
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: video.r2_object_key,
        }),
        { expiresIn: 120 },
      ),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }
}
