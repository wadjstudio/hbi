"use client";
import { ArrowUpRight } from "lucide-react";
import { shotZoneSample } from "@/features/analysis/shot-zone-sample";
import { percent, ratio } from "@/lib/analytics/metrics";
import type { Row } from "@/types/workspace";
import { useWorkspace } from "./provider";
import { ShotMap } from "./charts";

export const ShotZoneCard = ({
  shots,
  onEvidence,
}: {
  shots: Row[];
  onEvidence: (title: string, shots: Row[]) => void;
}) => {
  const w = useWorkspace();
  const sample = shotZoneSample(shots);
  const penalty = sample.groups.find((group) => group.key === "7m")!;
  const show = (title: string, selected: Row[]) => onEvidence(title, selected);
  return (
    <section
      className="intelligence-section shot-section"
      data-slot="shot-zone-card"
    >
      <header>
        <h3>{w.t("خريطة التصويب", "Shot map")}</h3>
        <button
          className="shot-penalty-share"
          disabled={!penalty.shots.length}
          aria-label={`${w.t("7م", "7m")} · ${penalty.shots.length}/${sample.sample} · ${percent(ratio(penalty.shots.length, sample.sample))}`}
          onClick={() => show(w.t("رميات 7م", "7m attempts"), penalty.shots)}
        >
          <span dir="ltr">7m</span>{" "}
          <b dir="ltr">{percent(ratio(penalty.shots.length, sample.sample))}</b>
        </button>
        <button
          className="evidence-text"
          disabled={!shots.length}
          onClick={() => show(w.t("تصويبات الفريق", "Team shots"), shots)}
        >
          {w.t("الأدلة", "Evidence")} <ArrowUpRight size={12} />
        </button>
      </header>
      <div className="shot-zone-layout">
        <div className="shot-zone-map">
          <ShotMap
            shots={shots}
            onGroup={(rows) =>
              show(w.t("عينة قطاع التصويب", "Shot location group"), rows)
            }
            onSelect={(shot) =>
              show(w.t("دليل التصويبة", "Shot evidence"), [shot])
            }
          />
          <details
            className="shot-zones-method"
            onKeyDown={(event) => {
              if (event.key === "Escape" && event.currentTarget.open) {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary
              aria-label={`${w.t("المناطق الموصّفة", "Coded zones")} ${sample.coded}/${sample.sample} · ${sample.missing.length} ${w.t("غير محدد", "unknown")}`}
            >
              {w.t("المناطق", "Zones")}{" "}
              <span dir="ltr">
                {sample.coded}/{sample.sample}
              </span>
            </summary>
            <div
              className="shot-zone-notes"
              role="region"
              tabIndex={0}
              aria-label={w.t("طريقة مناطق التصويب", "Shot zone method")}
            >
              <p>
                {w.t(
                  "النسب من كل محاولات العينة، بما فيها غير المحسومة. المنطقة الموصّفة مستقلة عن إحداثيات الخريطة. لا نفترض مسافة من المناطق الخلفية العامة.",
                  "Shares use all attempts, including unresolved outcomes. Coded zones are independent of map coordinates. Broad backcourt zones do not imply a distance.",
                )}
              </p>
              <button
                disabled={!sample.other.length}
                onClick={() =>
                  show(
                    w.t("مناطق موصّفة أخرى", "Other coded zones"),
                    sample.other,
                  )
                }
              >
                {w.t("مناطق أخرى", "Other zones")} · {sample.other.length}/
                {sample.sample}
              </button>
              <button
                disabled={!sample.missing.length}
                onClick={() =>
                  show(
                    w.t("منطقة غير محددة", "Unknown shot zone"),
                    sample.missing,
                  )
                }
              >
                {w.t("غير محدد", "Unknown")} · {sample.missing.length}/
                {sample.sample}
              </button>
            </div>
          </details>
        </div>
        <div
          className="shot-zone-legend"
          role="group"
          aria-label={w.t("مناطق التصويب المسجلة", "Recorded shot zones")}
        >
          {sample.groups
            .filter((group) => group.key !== "7m")
            .map((group) => (
              <button
                key={group.key}
                disabled={!group.shots.length}
                aria-label={`${w.t(group.ar, group.en)} · ${group.shots.length}/${sample.sample} · ${percent(ratio(group.shots.length, sample.sample))}`}
                onClick={() => show(w.t(group.ar, group.en), group.shots)}
              >
                <span title={w.t(group.ar, group.en)}>
                  {w.t(group.ar, group.en)}
                </span>
                <b dir="ltr">
                  {percent(ratio(group.shots.length, sample.sample))}
                </b>
              </button>
            ))}
        </div>
      </div>
    </section>
  );
};
