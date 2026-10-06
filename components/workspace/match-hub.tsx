"use client";
import Link from "next/link";
import { ArrowUpRight, Film, CalendarDays, Target, Users } from "lucide-react";
import { useWorkspace } from "./provider";
import { matchLabel } from "./entities";
import { ReferenceMatchCard } from "./reference-match";
import { s } from "@/types/workspace";

export function MatchHub() {
  const w = useWorkspace();
  const matches = [...w.list("matches")].sort((a, b) =>
    s(b.updated_at ?? b.created_at).localeCompare(
      s(a.updated_at ?? a.created_at),
    ),
  );
  return (
    <div className="match-hub">
      <header className="hub-heading">
        <div>
          <span className="hbi-kicker">COACHING WORKSPACE</span>
          <h1>
            {w.t(
              "المباراة أولًا. الدليل دائمًا.",
              "Match first. Evidence always.",
            )}
          </h1>
          <p>
            {w.t(
              "شاهد، سجّل، راجع النمط، وجهّز الفريق من مساحة واحدة.",
              "Watch, tag, review patterns and prepare your team in one workspace.",
            )}
          </p>
        </div>
        <Link className="workbench-link" href="/matches">
          <CalendarDays size={16} />
          {w.t("إدارة المباريات", "Manage matches")}
        </Link>
      </header>
      <ReferenceMatchCard />
      <section className="hub-matches">
        <div className="section-heading">
          <h2>{w.t("مساحات المباريات", "Match workspaces")}</h2>
          <small>
            {matches.length} {w.t("مباراة في المؤسسة", "organization matches")}
          </small>
        </div>
        {matches.length ? (
          <div className="match-card-grid">
            {matches.map((match) => {
              const sessions = w
                .list("analysis_sessions")
                .filter((session) => session.match_id === match.id);
              const primary = sessions.find((session) => session.is_primary);
              const count = primary
                ? w
                    .list("events")
                    .filter((e) => e.analysis_session_id === primary.id).length
                : 0;
              return (
                <Link
                  className="match-workspace-card"
                  key={match.id}
                  href={`/matches/${match.id}`}
                >
                  <div className="match-card-top">
                    <Film size={19} />
                    <span>
                      {primary
                        ? w.t("جاهزة للمراجعة", "Ready to review")
                        : w.t("بانتظار مصدر الفيديو", "Awaiting video source")}
                    </span>
                    <ArrowUpRight size={16} />
                  </div>
                  <h3>{matchLabel(match, w.list("teams"))}</h3>
                  <small>
                    {s(match.venue) ||
                      w.t("الملعب غير مسجل", "Venue not recorded")}
                  </small>
                  <div className="match-card-footer">
                    <span>
                      {count}{" "}
                      {w.t("حدث في الجلسة الأساسية", "primary-session events")}
                    </span>
                    <b>{w.t("فتح التحليل", "Open analysis")} ↗</b>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="workbench-empty">
            <Film />
            <div>
              <b>{w.t("ابدأ بمباراة واحدة", "Start with one match")}</b>
              <p>
                {w.t(
                  "جهّز المباراة المرجعية أعلاه أو أنشئ مباراة فريقك، ثم اربط الفيديو المحلي.",
                  "Prepare the reference match above or create your team's match, then link a local video.",
                )}
              </p>
            </div>
          </div>
        )}
      </section>
      <div className="hub-shortcuts">
        <Link href="/opponents">
          <Target />
          {w.t("دراسة الخصوم", "Study opponents")}
          <ArrowUpRight />
        </Link>
        <Link href="/meetings">
          <Users />
          {w.t("تجهيز اجتماع بالأدلة", "Prepare an evidence meeting")}
          <ArrowUpRight />
        </Link>
      </div>
    </div>
  );
}
