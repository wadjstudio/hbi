"use client";
import type { TacticalGroup } from "@/features/analysis/workbench";
import { percent, ratio } from "@/lib/analytics/metrics";
import { brand } from "@/lib/brand";
import { s, type Row } from "@/types/workspace";
import { useWorkspace } from "./provider";

const colors = [
  brand.colors.cyan,
  brand.colors.gold,
  brand.colors.save,
  brand.colors.goal,
  "#95a8b6",
];
export const DefenseSystemCard = ({
  groups,
  possessionCount,
  onEvidence,
}: {
  groups: TacticalGroup[];
  possessionCount: number;
  onEvidence: (title: string, events: Row[]) => void;
}) => {
  const w = useWorkspace();
  const ordered = [...groups].sort(
    (a, b) => b.possessions.length - a.possessions.length,
  );
  const total = ordered.reduce(
    (sum, group) => sum + group.possessions.length,
    0,
  );
  const leader = ordered[0];
  const tied = leader
    ? ordered.filter(
        (group) => group.possessions.length === leader.possessions.length,
      ).length
    : 0;
  const label = (group: TacticalGroup) =>
    s(w.lang === "ar" ? group.term.label_ar : group.term.label_en);
  const gradient = ordered
    .map((group, i) => {
      const previous = ordered
        .slice(0, i)
        .reduce((sum, item) => sum + item.possessions.length, 0);
      const start = (100 * previous) / Math.max(1, total);
      const end =
        (100 * (previous + group.possessions.length)) / Math.max(1, total);
      return `${colors[i % colors.length]} ${start}% ${end}%`;
    })
    .join(",");
  return (
    <section
      className="intelligence-section defense-section"
      data-slot="defense-system-card"
    >
      <header>
        <h3>{w.t("أنظمة الدفاع", "Defensive systems")}</h3>
        <small>{w.t("توصيفات مسجلة", "Recorded descriptors")}</small>
      </header>
      {leader && total ? (
        <>
          <div className="defense-distribution">
            <button
              className="defense-main-action"
              disabled={!leader.events.length}
              aria-label={`${label(leader)} · ${percent(ratio(leader.possessions.length, total))} · ${leader.possessions.length}/${total} ${w.t("توصيف", "descriptors")}${tied > 1 ? ` · ${w.t("صدارة مشتركة", "Joint leader")}` : ""}`}
              onClick={() => onEvidence(label(leader), leader.events)}
            >
              <span
                className="defense-ring"
                style={{ background: `conic-gradient(${gradient})` }}
              >
                <span className="defense-ring-core">
                  <strong dir="ltr">
                    {percent(ratio(leader.possessions.length, total))}
                  </strong>
                  <small title={label(leader)}>{label(leader)}</small>
                </span>
              </span>
            </button>
            <div className="defense-legend">
              {ordered.map((group, i) => (
                <button
                  key={group.term.id}
                  disabled={!group.events.length}
                  onClick={() => onEvidence(label(group), group.events)}
                >
                  <i
                    style={{ background: colors[i % colors.length] }}
                    aria-hidden="true"
                  />
                  <span>{label(group)}</span>
                  <b dir="ltr">
                    {percent(ratio(group.possessions.length, total))}
                  </b>
                </button>
              ))}
            </div>
          </div>
          <details className="chart-method defense-method">
            <summary>
              <span dir="ltr">n={total}</span>{" "}
              {w.t("توصيف · طريقة الحساب", "descriptors · method")}
              {tied > 1 && ` · ${tied} ${w.t("في الصدارة", "tied")}`}
            </summary>
            <small>
              {possessionCount}{" "}
              {w.t(
                "هجمة في العينة. التوزيع من التوصيفات؛ قد يتغير النظام داخل الهجمة. ليست نسبة من وقت اللعب أو كل المباراة.",
                "sample possessions. Distribution counts descriptors; systems can change within a possession. This is not playing-time share or full-match coverage.",
              )}
            </small>
          </details>
        </>
      ) : (
        <p className="intelligence-empty">
          {w.t(
            "صنّف النظام الدفاعي أثناء الهجمة ليظهر توزيعه وأدلته هنا.",
            "Tag defensive systems during possessions to reveal their distribution and evidence.",
          )}
        </p>
      )}
    </section>
  );
};
