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
  const session = typeof query.session === "string" ? query.session : "";
  const position =
    typeof query.at === "string" && /^\d+$/.test(query.at)
      ? Number(query.at)
      : 0;
  const at = Number.isSafeInteger(position) ? position : 0;
  return (
    <VideoWorkspace
      key={`${id}:${event}:${session}:${at}:${query.edit === "1" ? "edit" : "view"}`}
      matchId={id}
      initialSession={session}
      initialTimeMs={at}
    />
  );
}
