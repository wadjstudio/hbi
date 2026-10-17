"use client";
import { Info } from "lucide-react";
import {
  percent,
  reviewedShotAttempts,
  shotSummary,
} from "@/lib/analytics/metrics";
import type { Row } from "@/types/workspace";
import type { EvidenceTrendPoint } from "@/features/analysis/match-dashboard";
import { useWorkspace } from "./provider";
import { EfficiencyRing } from "./efficiency-ring";
import { EvidenceTrend } from "./evidence-trend";

export const ShotProfileCard = ({
  attempts,
  trend,
  onShots,
  onTrend,
}: {
  attempts: Row[];
  trend: EvidenceTrendPoint[];
  onShots: (title: string, rows: Row[]) => void;
  onTrend: (point: EvidenceTrendPoint) => void;
}) => {
  const w = useWorkspace();
  const reviewed = reviewedShotAttempts(attempts);
  const summary = shotSummary(attempts);
  const pending = attempts.filter((shot) => !reviewed.includes(shot));
  return (
    <article
      className="dashboard-card shot-profile-card"
      data-slot="shot-profile-card"
    >
      <header>
        <h3>{w.t("ملف التصويب", "Shot profile")}</h3>
        <details
          className="shot-profile-method"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary
            aria-label={w.t("طريقة حساب ملف التصويب", "Shot profile method")}
          >
            n={summary.sample} <Info size={12} aria-hidden="true" />
          </summary>
          <div
            tabIndex={0}
            role="region"
            aria-label={w.t("شرح حساب ملف التصويب", "Shot profile calculation")}
            className="shot-profile-method-content"
          >
            {w.t(
              "النسبة = الأهداف ÷ المحاولات المراجعة ذات النتيجة المعروفة. المحاولات المعلقة خارج المقام، والصفر في المقام يظهر كبيانات غير متاحة. الاتجاه تراكمي، وكل نقطة تفتح عينتها؛ لا يمثل اكتمال تحليل المباراة.",
              "Efficiency = goals / reviewed attempts with a known result. Pending attempts are excluded; a zero denominator is unavailable. The trend is cumulative and each point opens its sample; it does not establish full-match coverage.",
            )}
          </div>
        </details>
      </header>
      <div className="profile-ring-row">
        <button
          className="profile-efficiency"
          disabled={!summary.sample}
          onClick={() =>
            onShots(w.t("كفاءة التصويب", "Shot efficiency"), reviewed)
          }
          aria-label={`${w.t("كفاءة التصويب", "Shot efficiency")} · ${percent(summary.efficiency)} · ${summary.goals}/${summary.sample}`}
        >
          <EfficiencyRing
            value={summary.efficiency}
            isLarge
            caption={w.t("كفاءة التصويب", "Shot efficiency")}
          />
        </button>
        <div className="profile-shot-counts">
          <button
            disabled={!summary.goals}
            aria-label={`${summary.goals} ${w.t("أهداف مراجعة", "Reviewed goals")}`}
            onClick={() =>
              onShots(
                w.t("أهداف مراجعة", "Reviewed goals"),
                reviewed.filter((shot) => shot.result === "goal"),
              )
            }
          >
            <strong>{summary.goals}</strong>
            <small>{w.t("أهداف مراجعة", "Reviewed goals")}</small>
          </button>
          <button
            disabled={!pending.length}
            aria-label={`${summary.pending} ${w.t("محاولات للمراجعة", "Attempts to review")}`}
            onClick={() =>
              onShots(w.t("محاولات للمراجعة", "Attempts to review"), pending)
            }
          >
            <strong>{summary.pending}</strong>
            <small>{w.t("محاولات للمراجعة", "Attempts to review")}</small>
          </button>
        </div>
      </div>
      <EvidenceTrend
        data-testid="shot-efficiency-trend"
        points={trend}
        label={w.t(
          "كفاءة تراكمية حسب المحاولات المراجعة",
          "Cumulative efficiency by reviewed attempt",
        )}
        onEvidence={onTrend}
      />
    </article>
  );
};
