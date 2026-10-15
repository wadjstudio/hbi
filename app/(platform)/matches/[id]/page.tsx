import { VideoWorkspace } from "@/components/workspace/video-workspace";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const event = typeof query.event === "string" ? query.event : "";
  return (
    <VideoWorkspace
      key={`${id}:${event}:${query.edit === "1" ? "edit" : "view"}`}
      matchId={id}
    />
  );
}
