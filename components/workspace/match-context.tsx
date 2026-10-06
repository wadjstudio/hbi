"use client";
import Link from "next/link";
import { Film, Presentation, Clock3 } from "lucide-react";
import {
  isReferenceMatch,
  referenceMatch,
} from "@/features/matches/reference-match";
import { formatTime } from "@/lib/video/time";
import { s, type Row } from "@/types/workspace";
import { rowLabel } from "./controls";
import { useWorkspace } from "./provider";

export function MatchContext({
  match,
  session,
  clock,
  timeMs,
}: {
  match: Row;
  session?: Row;
  clock: { period: number; clockMs: number } | null;
  timeMs: number;
}) {
  const w = useWorkspace();
  const home = w.list("teams").find((team) => team.id === match.home_team_id),
    away = w.list("teams").find((team) => team.id === match.away_team_id);
  const competition = w
    .list("competitions")
    .find((c) => c.id === match.competition_id);
  return (
    <header className="match-context">
      <div className="match-context-meta">
        <span className="hbi-kicker">HANDBALL INTELLIGENCE / ANALYSIS</span>
        <b>
          {isReferenceMatch(match)
            ? w.t(referenceMatch.competitionAr, referenceMatch.competitionEn)
            : competition
              ? rowLabel(competition)
              : w.t("مساحة تحليل المباراة", "Match analysis workspace")}
        </b>
        <small>
          {s(match.venue) || w.t("الملعب غير محدد", "Venue not set")}
        </small>
      </div>
      <div className="match-context-score" dir="ltr">
        <div className="match-context-team">
          <i className="team-monogram home">
            {s(home?.short_name || home?.name).slice(0, 2) || "H"}
          </i>
          <b>{home ? rowLabel(home) : "—"}</b>
        </div>
        <div className="context-score">
          <strong>
            {match.home_score == null ? "—" : s(match.home_score)}
          </strong>
          <span>—</span>
          <strong>
            {match.away_score == null ? "—" : s(match.away_score)}
          </strong>
          <small>
            {w.t(
              "النتيجة المسجلة · ليست عدّ أحداث التحليل",
              "Recorded result · not tagged-event totals",
            )}
          </small>
        </div>
        <div className="match-context-team">
          <i className="team-monogram away">
            {s(away?.short_name || away?.name).slice(0, 2) || "A"}
          </i>
          <b>{away ? rowLabel(away) : "—"}</b>
        </div>
      </div>
      <div className="match-context-actions">
        <span>
          <Clock3 size={13} />
          {clock
            ? `${w.t("شوط", "Period")} ${clock.period} · ${formatTime(clock.clockMs)}`
            : w.t("ساعة المباراة غير معايرة", "Match clock not calibrated")}
        </span>
        <small>
          {w.t("الفيديو", "Video")} <b dir="ltr">{formatTime(timeMs)}</b> ·{" "}
          {session?.is_primary
            ? w.t("جلسة أساسية", "Primary session")
            : session
              ? w.t("جلسة إضافية", "Additional session")
              : w.t("لم تبدأ الجلسة", "No session yet")}
        </small>
        <div>
          <span className="analysis-mode">
            <Film size={13} />
            {w.t("تحليل", "Analysis")}
          </span>
          <Link href="/meetings">
            <Presentation size={14} />
            {w.t("الاجتماعات", "Meetings")}
          </Link>
        </div>
      </div>
    </header>
  );
}
