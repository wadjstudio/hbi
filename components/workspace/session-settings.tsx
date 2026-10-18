"use client";
import { useWorkspace } from "./provider";
import { SelectRow, type useAction } from "./controls";
import type { Row } from "@/types/workspace";

export function SessionSettings({
  matchId,
  sessions,
  sessionId,
  videoId,
  onSelect,
  onCreated,
  action,
}: {
  matchId: string;
  sessions: Row[];
  sessionId: string;
  videoId?: string;
  onSelect: (id: string) => void;
  onCreated: (id: string) => void;
  action: ReturnType<typeof useAction>;
}) {
  const w = useWorkspace();
  return (
    <details className="session-settings">
      <summary>
        {w.t("جلسات التحليل وإعداداتها", "Analysis sessions & settings")}
      </summary>
      <div className="toolbar">
        <SelectRow
          label={w.t("جلسة التحليل", "Analysis session")}
          rows={sessions}
          value={sessionId}
          onChange={onSelect}
        />
        <button
          disabled={!videoId}
          onClick={() =>
            void action.run(async () => {
              const session = await w.save("analysis_sessions", {
                match_id: matchId,
                video_id: videoId,
                title: `Analysis ${sessions.length + 1}`,
                is_primary: false,
              });
              onCreated(session.id);
            })
          }
        >
          {w.t("جلسة إضافية", "Additional session")}
        </button>
        <button
          disabled={!sessionId || !w.online}
          onClick={() =>
            void action.run(async () => {
              await w.flush();
              const { createClient } = await import("@/lib/supabase/client");
              const { error } = await createClient().rpc(
                "set_primary_analysis",
                { p_session: sessionId },
              );
              if (error) throw new Error(error.message);
              await w.reload();
            })
          }
        >
          {w.t("اعتماد للتحليلات المجمعة", "Use for aggregate analytics")}
        </button>
      </div>
    </details>
  );
}
