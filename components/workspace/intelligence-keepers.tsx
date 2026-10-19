"use client";
import Link from "next/link";
import { ArrowUpRight, Play } from "lucide-react";
import { keeperSummary, percent } from "@/lib/analytics/metrics";
import { s, type Row } from "@/types/workspace";
import { useWorkspace } from "./provider";
import { rowLabel } from "./controls";
import { PlayerAvatar } from "@/components/brand/brand-lockup";

export const IntelligenceKeepers = ({
  shots,
  events,
  onEvidence,
}: {
  shots: Row[];
  events: Row[];
  onEvidence: (title: string, events: Row[]) => void;
}) => {
  const w = useWorkspace();
  const ids = [
    ...new Set(shots.map((shot) => s(shot.goalkeeper_id)).filter(Boolean)),
  ];
  return (
    <section
      className="intelligence-sample-keepers intelligence-footer"
      data-slot="intelligence-keepers"
    >
      <header>
        <h3>{w.t("حراس الفريق", "Team goalkeepers")}</h3>
        <small>n={ids.length}</small>
      </header>
      <p>
        {w.t(
          "تصديات / تصديات + أهداف · المرمى الخالي والإهدار والحجب مستبعدة",
          "Saves / saves + goals · empty goals, misses and blocks excluded",
        )}
      </p>
      {ids.length ? (
        ids.map((id) => {
          const keeper = w.list("players").find((player) => player.id === id);
          const summary = keeperSummary(shots, id);
          const selected = shots.filter(
            (shot) =>
              shot.goalkeeper_id === id &&
              !shot.empty_goal &&
              !shot.review_required &&
              ["goal", "save"].includes(s(shot.result)),
          );
          return (
            <button
              key={id}
              className="threat-row"
              data-goalkeeper-id={id}
              disabled={!selected.length}
              onClick={() => {
                onEvidence(
                  keeper ? rowLabel(keeper) : w.t("الحارس", "Goalkeeper"),
                  events.filter((event) =>
                    selected.some((shot) => shot.event_id === event.id),
                  ),
                );
              }}
            >
              <PlayerAvatar number="GK" photoUrl={s(keeper?.photo_url)} />
              <span>
                <b>{keeper ? rowLabel(keeper) : "—"}</b>
                <small>
                  {summary.saves}/{summary.sample}
                </small>
              </span>
              <strong dir="ltr">{percent(summary.percentage)}</strong>
              <Play size={13} aria-hidden="true" />
            </button>
          );
        })
      ) : (
        <p>
          {w.t(
            "حدّد الحارس أمام محاولات الخصم لعرض التصديات وأدلتها.",
            "Identify the keeper facing opponent attempts to show saves and evidence.",
          )}
        </p>
      )}
      <Link className="intelligence-more" href="/opponents">
        {w.t("مساحة تحليل الخصم", "Opponent workspace")}
        <ArrowUpRight size={13} />
      </Link>
    </section>
  );
};
