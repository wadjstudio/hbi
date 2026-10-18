"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { Info } from "lucide-react";
import { percent, type shotSummary } from "@/lib/analytics/metrics";
import { useWorkspace } from "./provider";

export const IntelligenceSample = ({
  summary,
  sampleSize,
  isHistorical,
  isShotEvidenceAvailable,
  onShots,
  onEvents,
  children,
}: {
  summary: ReturnType<typeof shotSummary>;
  sampleSize: number;
  isHistorical: boolean;
  isShotEvidenceAvailable: boolean;
  onShots: () => void;
  onEvents: () => void;
  children?: ReactNode;
}) => {
  const w = useWorkspace();
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: Event) => {
      if (
        event.target instanceof Node &&
        !ref.current?.contains(event.target) &&
        ref.current
      )
        ref.current.open = false;
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("focusin", dismiss);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("focusin", dismiss);
    };
  }, []);
  const close = () => {
    if (ref.current) {
      ref.current.open = false;
      ref.current.querySelector("summary")?.focus();
    }
  };
  return (
    <details
      ref={ref}
      className="intelligence-sample"
      data-slot="intelligence-sample"
      onKeyDown={(event) => {
        if (event.key === "Escape" && event.currentTarget.open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
      }}
    >
      <summary
        aria-label={`${w.t("تفاصيل عينة التحليل", "Intelligence sample details")} · n=${sampleSize}`}
      >
        <span dir="ltr">n={sampleSize}</span>
        <Info size={13} aria-hidden="true" />
      </summary>
      <div
        className="intelligence-sample-content"
        role="region"
        tabIndex={0}
        aria-label={w.t("تفاصيل عينة التحليل", "Intelligence sample details")}
      >
        <p>
          {isHistorical
            ? w.t(
                "العينة التاريخية المختارة · جلسة أساسية واحدة لكل مباراة",
                "Selected historical sample · one primary session per match",
              )
            : w.t("الجلسة الحالية فقط", "Current session only")}
        </p>
        <div className="rail-summary">
          <button
            disabled={!isShotEvidenceAvailable}
            onClick={() => {
              close();
              onShots();
            }}
          >
            <small>{w.t("كفاءة التصويب", "Shot efficiency")}</small>
            <b>{percent(summary.efficiency)}</b>
            <small>
              {summary.goals}/{summary.sample} · {summary.pending}{" "}
              {w.t("للمراجعة", "to review")}
            </small>
          </button>
          <button
            disabled={sampleSize === 0}
            onClick={() => {
              close();
              onEvents();
            }}
          >
            <small>{w.t("حجم العينة", "Sample size")}</small>
            <b>{sampleSize}</b>
            <small>
              {isHistorical
                ? w.t("حدث · العينة التاريخية", "events · historical sample")
                : w.t("حدث · جلسة واحدة", "events · one session")}
            </small>
          </button>
        </div>
        <div
          onClickCapture={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest("button,a")
            )
              close();
          }}
        >
          {children}
        </div>
      </div>
    </details>
  );
};
