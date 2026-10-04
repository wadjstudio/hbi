import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { r2, settings } from "@/lib/r2/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
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
      .select("*")
      .eq("id", video_id)
      .single();
    if (!video)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const { data: member } = await c
      .from("organization_members")
      .select("role")
      .eq("organization_id", video.organization_id)
      .eq("user_id", user.id)
      .single();
    if (!member || member.role === "viewer")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (video.file_size_bytes == null || video.file_size_bytes <= 0)
      throw new Error("Video size is missing; relink source first");
    const config = settings();
    const key = `${video.organization_id}/${video.id}/source`;
    const { error } = await c.rpc("reserve_video_upload", {
      p_video: video.id,
      p_limit: config.limit,
    });
    if (error) throw new Error(error.message);
    return NextResponse.json({
      url: await getSignedUrl(
        r2(config),
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          ContentType: video.mime_type ?? "video/mp4",
          ContentLength: video.file_size_bytes,
        }),
        { expiresIn: 120 },
      ),
      key,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 },
    );
  }
}
