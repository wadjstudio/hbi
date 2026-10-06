"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Play, Video, ArrowLeft } from "lucide-react";
import {
  referenceMatch,
  isReferenceMatch,
  importReferenceMatch,
} from "@/features/matches/reference-match";
import { canWrite } from "@/lib/permissions/roles";
import { useWorkspace } from "./provider";
import { Notice, useAction } from "./controls";

export function ReferenceBroadcast({ compact = false }: { compact?: boolean }) {
  const w = useWorkspace();
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={`reference-broadcast ${compact ? "compact" : ""}`}>
      {loaded && w.online ? (
        <iframe
          title={w.t(
            "الأهلي والزمالك · التسجيل الرسمي من ON Sport",
            "Al Ahly vs Zamalek · official ON Sport broadcast",
          )}
          src={`https://www.youtube-nocookie.com/embed/${referenceMatch.youtubeId}?start=${referenceMatch.previewStartSeconds}&rel=0&playsinline=1`}
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <div className="broadcast-cover">
          <span className="hbi-kicker">ON SPORT / FULL MATCH</span>
          <div className="broadcast-teams">
            <b>{w.t(referenceMatch.home.ar, referenceMatch.home.en)}</b>
            <span>VS</span>
            <b>{w.t(referenceMatch.away.ar, referenceMatch.away.en)}</b>
          </div>
          <button
            disabled={!w.online}
            className="primary"
            onClick={() => setLoaded(true)}
          >
            <Play size={16} />
            {w.t("مشاهدة التسجيل الرسمي", "Watch official broadcast")}
          </button>
          <small>
            {w.t(
              "المشاهدة تحتاج اتصالًا · التحليل دون اتصال يحتاج ملفًا محليًا",
              "Watching needs internet · offline analysis needs a local file",
            )}
          </small>
        </div>
      )}
      <div className="broadcast-source">
        <a href={referenceMatch.broadcastUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={13} />
          {w.t("فتح المصدر على YouTube", "Open source on YouTube")}
        </a>
        <span>
          {w.t(
            "23 مايو 2025 · التسجيل يشمل الاستوديو",
            "23 May 2025 · recording includes studio",
          )}
        </span>
      </div>
    </div>
  );
}

export function ReferenceMatchCard() {
  const w = useWorkspace(),
    router = useRouter(),
    a = useAction();
  const existing = w.list("matches").find(isReferenceMatch);
  return (
    <section className="reference-match-card">
      <div className="reference-copy">
        <span className="hbi-kicker">REAL MATCH / VERIFIED SOURCE</span>
        <h2>{w.t("الأهلي × الزمالك", "Al Ahly × Zamalek")}</h2>
        <p>
          {w.t(referenceMatch.competitionAr, referenceMatch.competitionEn)} ·
          23/05/2025
        </p>
        <div className="reference-score" dir="ltr">
          31 <span>—</span> 28{" "}
          <small>
            {w.t("النتيجة النهائية الموثقة", "Verified final result")}
          </small>
        </div>
        <p className="reference-disclaimer">
          {w.t(
            "نبدأ بالمباراة ومصدرها. التصويبات والتكتيكات والقوائم تحتاج تسجيلًا ومراجعة؛ لم نستورد أحداثًا تخمينية.",
            "Start with the match and its source. Shots, tactics and lineups need tagging and review; no guessed events are imported.",
          )}
        </p>
        <div className="toolbar">
          {existing ? (
            <Link className="workbench-link" href={`/matches/${existing.id}`}>
              <Video size={16} />
              {w.t("فتح مساحة تحليل المباراة", "Open match analysis")}
            </Link>
          ) : (
            <button
              className="primary"
              disabled={a.busy || !canWrite(w.role, "matches")}
              onClick={() =>
                void a.run(async () => {
                  const match = await importReferenceMatch({
                    org: w.org,
                    role: w.role,
                    teams: w.list("teams"),
                    matches: w.list("matches"),
                    save: w.save,
                  });
                  router.push(`/matches/${match.id}`);
                })
              }
            >
              <ArrowLeft size={16} />
              {a.busy
                ? w.t("تجهيز المباراة…", "Preparing match…")
                : w.t("تجهيز المباراة للتحليل", "Prepare match for analysis")}
            </button>
          )}
          <a href={referenceMatch.reportUrl} target="_blank" rel="noreferrer">
            {w.t("تقرير النتيجة الرسمي ↗", "Official result report ↗")}
          </a>
        </div>
        {a.error && <Notice>{a.error}</Notice>}
      </div>
      <ReferenceBroadcast compact />
    </section>
  );
}
