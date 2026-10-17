"use client";
import { Play } from "lucide-react";
import { useId } from "react";
import { PlayerAvatar } from "@/components/brand/brand-lockup";
import { percent, type shotSummary } from "@/lib/analytics/metrics";
import { useWorkspace } from "./provider";
import { EfficiencyRing } from "./efficiency-ring";

export const PlayerThreatRow = ({
  name,
  number,
  summary,
  onAll,
  onReviewed,
}: {
  name: string;
  number: string;
  summary: ReturnType<typeof shotSummary>;
  onAll: () => void;
  onReviewed: () => void;
}) => {
  const w = useWorkspace();
  const descriptionId = useId();
  return (
    <div className="player-threat-row" data-slot="player-threat-row">
      <button
        className="player-threat-identity"
        onClick={onAll}
        aria-label={`${name} · ${w.t("كل المحاولات", "All attempts")}`}
        aria-describedby={descriptionId}
      >
        <PlayerAvatar number={number} />
        <span>
          <b title={name}>{name}</b>
          <small
            id={descriptionId}
            title={
              summary.sample < 10
                ? w.t(
                    "عينة قليلة؛ لا تمثل تغطية مباراة كاملة",
                    "Small sample; not full-match coverage",
                  )
                : undefined
            }
          >
            {summary.goals}/{summary.sample} {w.t("مراجعة", "reviewed")}
            {summary.pending > 0 && (
              <>
                {" "}
                · {summary.pending} {w.t("للمراجعة", "pending")}
              </>
            )}
            {summary.pending === 0 && summary.sample < 10 && (
              <> · {w.t("عينة قليلة", "Small sample")}</>
            )}
          </small>
        </span>
        <Play size={12} aria-hidden="true" />
      </button>
      <button
        className="player-threat-efficiency"
        disabled={!summary.sample}
        onClick={onReviewed}
        title={w.t(
          "أدلة نسبة التصويب · المحاولات المراجعة فقط",
          "Shooting efficiency evidence · reviewed attempts only",
        )}
        aria-label={`${name} · ${w.t("كفاءة التصويب", "Shooting efficiency")} · ${percent(summary.efficiency)} · ${summary.goals}/${summary.sample}`}
      >
        <EfficiencyRing value={summary.efficiency} />
      </button>
    </div>
  );
};
