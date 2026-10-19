"use client";
import { MatchHeaderActions } from "./match-header-actions";
import { TeamCrest } from "@/components/brand/team-crest";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { Info, Trophy } from "lucide-react";
import { headerDate } from "@/features/workspace/header-date";
import { createPortal } from "react-dom";
import {
  isReferenceMatch,
  referenceMatch,
} from "@/features/matches/reference-match";
import { formatTime } from "@/lib/video/time";
import { s, type Row } from "@/types/workspace";
import { rowLabel } from "./controls";
import { useWorkspace } from "./provider";
import type { ReactNode } from "react";
const subscribe = () => () => {};
const getHeader = () => document.getElementById("match-header-slot");
const getServerHeader = () => null;

export function MatchContext({
  match,
  session,
  clock,
  timeMs,
  selector,
}: {
  match: Row;
  session?: Row;
  clock: { period: number; clockMs: number } | null;
  timeMs: number;
  selector?: ReactNode;
}) {
  const w = useWorkspace();
  const info = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !info.current?.contains(event.target) &&
        info.current
      )
        info.current.open = false;
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);
  const header = useSyncExternalStore(subscribe, getHeader, getServerHeader);
  const home = w
      .list("teams")
      .find(
        (team) =>
          team.id === match.home_team_id && team.organization_id === w.org,
      ),
    away = w
      .list("teams")
      .find(
        (team) =>
          team.id === match.away_team_id && team.organization_id === w.org,
      );
  const competition = w
    .list("competitions")
    .find((c) => c.id === match.competition_id && c.organization_id === w.org);
  const date = headerDate(match.starts_at, w.lang);
  const competitionName = isReferenceMatch(match)
    ? w.t(referenceMatch.competitionAr, referenceMatch.competitionEn)
    : competition
      ? rowLabel(competition)
      : w.t("مساحة تحليل المباراة", "Match analysis workspace");
  const venue = s(match.venue) || w.t("الملعب غير محدد", "Venue not set");
  const homeName = home ? rowLabel(home) : "—",
    awayName = away ? rowLabel(away) : "—";
  const content = (
    <header className="match-context">
      <div className="match-context-meta">
        <div className="context-match-picker">{selector}</div>
        <b className="match-competition" title={competitionName}>
          <Trophy size={17} aria-hidden="true" />
          <span>{competitionName}</span>
        </b>
        <small
          className="match-inline-details"
          title={`${date ? `${date.label} (UTC) · ` : ""}${venue}`}
        >
          {date && (
            <>
              <time dateTime={date.iso}>{date.label}</time>
              <span> (UTC) · </span>
            </>
          )}
          {venue}
        </small>
        <details
          ref={info}
          className="match-info"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary aria-label={w.t("تفاصيل المباراة", "Match details")}>
            <Info size={16} aria-hidden="true" />
          </summary>
          <div
            className="match-info-popover"
            role="region"
            tabIndex={0}
            aria-label={w.t("تفاصيل المباراة الكاملة", "Full match details")}
          >
            <b>{w.t("تفاصيل المباراة", "Match details")}</b>
            <dl>
              <dt>{w.t("البطولة", "Competition")}</dt>
              <dd>{competitionName}</dd>
              <dt>{w.t("الفريقان", "Teams")}</dt>
              <dd>
                <bdi>{homeName}</bdi> — <bdi>{awayName}</bdi>
              </dd>
              <dt>{w.t("التاريخ (UTC)", "Date (UTC)")}</dt>
              <dd>
                {date ? (
                  <time dateTime={date.iso}>{date.label}</time>
                ) : (
                  w.t("التاريخ غير مسجل", "Date not recorded")
                )}
              </dd>
              <dt>{w.t("الملعب", "Venue")}</dt>
              <dd>{venue}</dd>
            </dl>
          </div>
        </details>
      </div>
      <div className="match-context-score" dir="ltr">
        <div className="match-context-team">
          <TeamCrest
            name={homeName}
            shortName={s(home?.short_name)}
            logoUrl={s(home?.logo_url)}
            isHome
          />
          <b title={homeName}>{s(home?.short_name) || homeName}</b>
        </div>
        <div className="context-score">
          <strong>
            {match.home_score == null ? "—" : s(match.home_score)}
          </strong>
          <span className="recorded-result">
            {w.t("النتيجة المسجلة", "Recorded result")}
          </span>
          <span>—</span>
          <strong>
            {match.away_score == null ? "—" : s(match.away_score)}
          </strong>
          <small
            title={w.t(
              "النتيجة المسجلة مستقلة عن عدّ أحداث التحليل",
              "Recorded result is independent of tagged events",
            )}
          >
            {clock
              ? `${formatTime(clock.clockMs)} · ${w.t("شوط", "Period")} ${clock.period}`
              : w.t("ساعة المباراة غير معايرة", "Match clock not calibrated")}
          </small>
        </div>
        <div className="match-context-team">
          <TeamCrest
            name={awayName}
            shortName={s(away?.short_name)}
            logoUrl={s(away?.logo_url)}
          />
          <b title={awayName}>{s(away?.short_name) || awayName}</b>
        </div>
      </div>
      <div className="match-context-actions">
        <small>
          {w.t("الفيديو", "Video")} <b dir="ltr">{formatTime(timeMs)}</b> ·{" "}
          {session?.is_primary
            ? w.t("جلسة أساسية", "Primary session")
            : session
              ? w.t("جلسة إضافية", "Additional session")
              : w.t("لم تبدأ الجلسة", "No session yet")}
        </small>
        <MatchHeaderActions
          key={`${match.id}:${session?.id ?? ""}`}
          match={match}
          session={session}
          timeMs={timeMs}
        />
      </div>
    </header>
  );
  return header ? createPortal(content, header) : content;
}
