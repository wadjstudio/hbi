"use client";
import { useState, type ComponentProps } from "react";
import { ArrowUpRight, CheckCheck, CircleAlert, Pencil } from "lucide-react";
import { reviewQueue, type ReviewItem } from "@/features/analysis/review-queue";
import type { SessionScope } from "@/features/analysis/session-statistics";
import { analysisLabel } from "@/features/analysis/labels";
import { formatTime } from "@/lib/video/time";
import { s, type Row } from "@/types/workspace";
import { useWorkspace } from "./provider";
import { rowLabel } from "./controls";

type ReviewQueueProps = ComponentProps<"section"> & {
  scope: SessionScope;
  events: Row[];
  shots: Row[];
  legacy: Row[];
  isCanEdit: boolean;
  isCanResolve: boolean;
  onEvidence: (event: Row) => void;
  onCorrect: (item: ReviewItem) => void;
  onResolve: (legacy: Row) => void;
};
export const ReviewQueue = ({
  scope,
  events,
  shots,
  legacy,
  isCanEdit,
  isCanResolve,
  onEvidence,
  onCorrect,
  onResolve,
  className,
  ...props
}: ReviewQueueProps) => {
  const w = useWorkspace();
  const [filter, setFilter] = useState("all");
  const queue = reviewQueue(scope, { events, shots, legacy });
  const groups = [
    { key: "all", ar: "الكل", en: "All", count: queue.length },
    {
      key: "pending",
      ar: "نتيجة / تحقق",
      en: "Result / verification",
      count: queue.filter((item) =>
        ["result", "verification", "ambiguous"].includes(item.status),
      ).length,
    },
    {
      key: "legacy",
      ar: "تفاصيل التصويبة ناقصة",
      en: "Missing shot details",
      count: queue.filter((item) => item.status === "legacy").length,
    },
    {
      key: "ready",
      ar: "جاهز لإغلاق المراجعة",
      en: "Ready to close review",
      count: queue.filter((item) => item.status === "ready").length,
    },
  ];
  const visible = queue.filter(
    (item) =>
      filter === "all" ||
      (filter === "pending"
        ? ["result", "verification", "ambiguous"].includes(item.status)
        : item.status === filter),
  );
  const labels = {
    result: ["نتيجة غير محسومة", "Unresolved result"],
    verification: ["النتيجة تحتاج التحقق", "Result needs verification"],
    legacy: ["تحتاج استكمال بيانات التصويبة", "Shot details needed"],
    ready: [
      "تصويبة مؤكدة؛ مراجعة قديمة مفتوحة",
      "Confirmed shot; earlier review open",
    ],
    ambiguous: [
      "محاولات متعددة مرتبطة بنفس الحدث",
      "Multiple attempts linked to this event",
    ],
  } as const;
  return (
    <section
      {...props}
      data-slot="review-queue"
      className={`review-queue ${className ?? ""}`}
      aria-label={w.t("قائمة مراجعة العينة", "Selection review queue")}
    >
      <header>
        <div>
          <h3>
            <CircleAlert size={19} aria-hidden="true" />
            {w.t("راجع قبل الاستنتاج", "Review before drawing conclusions")}
          </h3>
          <p>
            {w.t(
              "حسب الجلسة والفلاتر الحالية. كل صف يمثل حدثًا واحدًا؛ الوسم القديم لا يثبت نتيجة تصويبة مؤكدة.",
              "Current session and filters. Each row is one event; an older tag does not establish a verified shot result.",
            )}
          </p>
        </div>
        <b>
          {queue.length} {w.t("حالات", "items")}
        </b>
      </header>
      <div
        className="review-filters"
        role="group"
        aria-label={w.t("نوع المراجعة", "Review category")}
      >
        {groups.map((group) => (
          <button
            key={group.key}
            type="button"
            aria-pressed={filter === group.key}
            onClick={() => setFilter(group.key)}
          >
            {w.t(group.ar, group.en)} <b>{group.count}</b>
          </button>
        ))}
      </div>
      {!visible.length && (
        <p className="notice">
          {queue.length
            ? w.t("لا توجد حالات ضمن هذا النوع.", "No items in this category.")
            : w.t(
                "لا توجد حالات مراجعة ضمن الاختيار. هذا لا يثبت اكتمال تحليل المباراة.",
                "No review items in this selection. This does not establish complete match analysis.",
              )}
        </p>
      )}
      <div className="review-items">
        {visible.map((item) => {
          const { event, shot } = item;
          const playerId = shot ? shot.shooter_id : event.actor_player_id;
          const player = w
            .list("players")
            .find(
              (row) =>
                row.organization_id === scope.organizationId &&
                row.id === playerId,
            );
          const team = w
            .list("teams")
            .find(
              (row) =>
                row.organization_id === scope.organizationId &&
                row.id === event.team_id,
            );
          const hasTime =
            typeof event.timestamp_ms === "number" &&
            Number.isFinite(event.timestamp_ms) &&
            event.timestamp_ms >= 0;
          return (
            <article
              key={event.id}
              data-review-event-id={event.id}
              data-review-status={item.status}
              className="review-item"
            >
              <div className="review-time">
                <b dir="ltr">
                  {hasTime ? formatTime(event.timestamp_ms as number) : "—"}
                </b>
                <small>{w.t("زمن المصدر", "Source time")}</small>
              </div>
              <div className="review-description">
                <span className={`review-status review-status-${item.status}`}>
                  {w.t(labels[item.status][0], labels[item.status][1])}
                </span>
                <h4>
                  {player
                    ? rowLabel(player)
                    : w.t("هوية غير مسجلة", "Identity not recorded")}{" "}
                  · {team ? rowLabel(team) : "—"}
                </h4>
                <p>
                  {analysisLabel(s(event.event_type), w.lang)} ·{" "}
                  {shot
                    ? analysisLabel(s(shot.result), w.lang)
                    : w.t("نتيجة التصويبة غير مؤكدة", "Shot result not confirmed")}
                </p>
                {item.legacy && (
                  <small>
                    {w.t("سبب المراجعة المحفوظ", "Saved review reason")}:{" "}
                    {s(item.legacy.reason)}
                  </small>
                )}
              </div>
              <div className="review-actions">
                <button type="button" onClick={() => onEvidence(event)}>
                  <ArrowUpRight size={15} aria-hidden="true" />
                  {w.t("الدليل", "Evidence")}
                </button>
                <button
                  type="button"
                  disabled={!isCanEdit || item.status === "ambiguous"}
                  onClick={() => onCorrect(item)}
                >
                  <Pencil size={15} aria-hidden="true" />
                  {w.t("تصحيح المحاولة", "Correct attempt")}
                </button>
                {item.legacy && (
                  <button
                    type="button"
                    disabled={!isCanResolve || item.status !== "ready"}
                    onClick={() => onResolve(item.legacy!)}
                  >
                    <CheckCheck size={15} aria-hidden="true" />
                    {w.t("إغلاق المراجعة القديمة", "Close legacy review")}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
