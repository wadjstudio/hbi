"use client";
import type { ComponentProps } from "react";
import { ArrowUpRight, Pencil, Scissors } from "lucide-react";
import {
  sessionSample,
  type SessionScope,
} from "@/features/analysis/session-statistics";
import { analysisLabel } from "@/features/analysis/labels";
import { formatTime } from "@/lib/video/time";
import { s, type Row } from "@/types/workspace";
import { PlayerAvatar } from "@/components/brand/brand-lockup";
import { rowLabel } from "./controls";
import { useWorkspace } from "./provider";

type EventFeedProps = ComponentProps<"section"> & {
  scope: SessionScope;
  events: Row[];
  shots: Row[];
  isCanEdit: boolean;
  isCanClip: boolean;
  onEdit: (event: Row) => void;
  onClip: (event: Row) => void;
  onEvidence: (title: string, rows: Row[]) => void;
};
export const EventFeed = ({
  scope,
  events,
  shots,
  isCanEdit,
  isCanClip,
  onEdit,
  onClip,
  onEvidence,
  className,
  ...props
}: EventFeedProps) => {
  const w = useWorkspace();
  const sample = sessionSample(scope, {
    events,
    shots,
    possessions: [],
    intervals: [],
  });
  const time = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0
      ? formatTime(value)
      : "—";
  return (
    <section
      {...props}
      data-slot="event-feed"
      className={`event-feed ${className ?? ""}`}
      aria-label={w.t("سجل أحداث الجلسة", "Session event feed")}
    >
      <header>
        <b>
          {w.t("أحداث العينة الحالية", "Current selection events")} · n=
          {sample.events.length}
        </b>
        <small>
          {w.t(
            "زمن المصدر مستقل عن ساعة المباراة؛ الشرطة تعني وقتًا غير مسجل.",
            "Source time is separate from the game clock; a dash means an unrecorded time.",
          )}
        </small>
      </header>
      {!sample.events.length && (
        <p className="notice">
          {w.t(
            "لا توجد أحداث ضمن الجلسة والفلاتر الحالية.",
            "No events in this session/filter selection.",
          )}
        </p>
      )}
      {sample.events.map((event) => {
        const shot = sample.shots.find((row) => row.event_id === event.id);
        const id = shot?.shooter_id || event.actor_player_id;
        const player = w
          .list("players")
          .find(
            (row) =>
              row.organization_id === scope.organizationId && row.id === id,
          );
        const team = w
          .list("teams")
          .find(
            (row) =>
              row.organization_id === scope.organizationId &&
              row.id === event.team_id,
          );
        const pending = Boolean(
          shot && (shot.review_required || shot.result === "unknown"),
        );
        const legacy =
          !shot &&
          [
            "shot",
            "goal",
            "save",
            "miss",
            "blocked_shot",
            "seven_meter_shot",
          ].includes(s(event.event_type));
        const label = `${analysisLabel(s(event.event_type), w.lang)}${shot ? ` · ${analysisLabel(s(shot.result), w.lang)}` : ""}`;
        return (
          <article
            className="event-feed-row"
            key={event.id}
            data-feed-event-id={event.id}
            data-result={s(shot?.result)}
          >
            <div className="event-feed-time">
              <b dir="ltr">{time(event.timestamp_ms)}</b>
              <small>{w.t("المصدر", "Source")}</small>
              <span>
                {w.t("شوط", "Period")} {s(event.period) || "—"} ·{" "}
                <span dir="ltr">{time(event.match_clock_ms)}</span>
              </span>
            </div>
            <PlayerAvatar number={s(player?.shirt_number)} />
            <div className="event-feed-description">
              <h3>{label}</h3>
              <p>
                {player
                  ? rowLabel(player)
                  : w.t("هوية غير مسجلة", "Identity not recorded")}{" "}
                · {team ? rowLabel(team) : "—"}
              </p>
              {s(event.note) && <small>{s(event.note)}</small>}
              {(pending || legacy) && (
                <span className="event-review-state">
                  {legacy
                    ? w.t(
                        "محاولة قديمة تحتاج المراجعة",
                        "Legacy attempt needs review",
                      )
                    : w.t("محاولة للمراجعة", "Attempt to review")}
                </span>
              )}
            </div>
            <div className="event-feed-actions">
              <button onClick={() => onEvidence(label, [event])}>
                <ArrowUpRight size={14} />
                {w.t("الدليل", "Evidence")}
              </button>
              <button disabled={!isCanEdit} onClick={() => onEdit(event)}>
                <Pencil size={14} />
                {w.t("تعديل", "Edit")}
              </button>
              <button disabled={!isCanClip} onClick={() => onClip(event)}>
                <Scissors size={14} />
                {w.t("مقطع دليل", "Evidence clip")}
              </button>
            </div>
          </article>
        );
      })}
    </section>
  );
};
