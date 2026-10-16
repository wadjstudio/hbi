"use client";
import type { ComponentProps } from "react";
import { Eye, Pencil, Trash2, Pause } from "lucide-react";
import { z } from "zod";
import { drawingSchema, type Row } from "@/types/workspace";
import { formatTime } from "@/lib/video/time";
import { DrawingEditor } from "./drawing";
import { useWorkspace } from "./provider";

type AnnotationLibraryProps = ComponentProps<"section"> & {
  rows: Row[];
  organizationId: string;
  sessionId: string;
  videoId: string;
  isCanEdit: boolean;
  isCanSeek: boolean;
  onSeek: (row: Row) => void;
  onEdit: (row: Row) => void;
  onRemove: (row: Row) => void;
};
export const AnnotationLibrary = ({
  rows,
  organizationId,
  sessionId,
  videoId,
  isCanEdit,
  isCanSeek,
  onSeek,
  onEdit,
  onRemove,
  className,
  ...props
}: AnnotationLibraryProps) => {
  const w = useWorkspace();
  const layers = rows
    .filter(
      (row) =>
        Boolean(sessionId && videoId) &&
        row.organization_id === organizationId &&
        row.analysis_session_id === sessionId &&
        row.video_id === videoId,
    )
    .sort((a, b) => Number(a.start_ms) - Number(b.start_ms));
  return (
    <section
      {...props}
      data-slot="annotation-library"
      className={`annotation-library ${className ?? ""}`}
      aria-label={w.t("مكتبة رسومات الفيديو", "Video drawing library")}
    >
      <header>
        <div>
          <h3>
            {w.t("طبقات الشرح", "Telestration layers")}{" "}
            <span>· {layers.length}</span>
          </h3>
          <p>
            {w.t(
              "رسم يدوي مرتبط بزمن المصدر. المعاينات تعرض الرسم وحده، دون الفيديو.",
              "Manual drawings at source time. Previews show the drawing alone, without video.",
            )}
          </p>
        </div>
        <span className="annotation-method">
          {w.t("إحداثيات نسبية", "Normalized coordinates")}
        </span>
      </header>
      {!isCanSeek && (
        <p className="notice">
          {w.t(
            "أعد ربط فيديو محلي لعرض الطبقات فوقه وتحريرها.",
            "Relink a local video to view layers over footage and edit them.",
          )}
        </p>
      )}
      {!layers.length && (
        <p className="notice">
          {w.t(
            "لا توجد طبقات لهذا المصدر والجلسة. أوقف اللقطة ثم اختر «رسم على الفيديو» لإضافة شرح.",
            "No layers for this source and session. Pause a frame, then choose Telestration to add a drawing.",
          )}
        </p>
      )}
      <div className="annotation-layer-grid">
        {layers.map((row) => {
          const drawings = z
            .array(drawingSchema)
            .max(500)
            .safeParse(row.objects);
          const isTimed =
            typeof row.start_ms === "number" &&
            Number.isFinite(row.start_ms) &&
            row.start_ms >= 0 &&
            typeof row.end_ms === "number" &&
            Number.isFinite(row.end_ms) &&
            row.end_ms > row.start_ms;
          return (
            <article
              key={row.id}
              data-annotation-id={row.id}
              className="annotation-layer-card"
            >
              <div
                className="annotation-preview"
                aria-label={w.t("معاينة الرسم فقط", "Drawing-only preview")}
              >
                {drawings.success ? (
                  <DrawingEditor
                    objects={drawings.data}
                    onChange={() => {}}
                    overlay
                    editable={false}
                  />
                ) : (
                  <span>
                    {w.t("بيانات رسم غير صالحة", "Invalid drawing data")}
                  </span>
                )}
              </div>
              <div className="annotation-layer-body">
                <b dir="ltr">
                  {isTimed
                    ? `${formatTime(row.start_ms as number)} → ${formatTime(row.end_ms as number)}`
                    : w.t("فترة تحتاج التصحيح", "Time range needs correction")}
                </b>
                <small>
                  {w.t("زمن المصدر", "Source time")} ·{" "}
                  {drawings.success ? drawings.data.length : "—"}{" "}
                  {w.t("عناصر", "objects")}
                </small>
                {row.pause_on_entry && (
                  <span className="annotation-pause">
                    <Pause size={13} aria-hidden="true" />
                    {w.t("توقف عند الدخول", "Pause on entry")}
                  </span>
                )}
                <div className="annotation-layer-actions">
                  <button
                    type="button"
                    disabled={!isCanSeek || !isTimed}
                    onClick={() => onSeek(row)}
                  >
                    <Eye size={15} aria-hidden="true" />
                    {w.t("عرض اللقطة", "View frame")}
                  </button>
                  <button
                    type="button"
                    disabled={
                      !isCanEdit || !isCanSeek || !isTimed || !drawings.success
                    }
                    onClick={() => onEdit(row)}
                  >
                    <Pencil size={15} aria-hidden="true" />
                    {w.t("تحرير", "Edit")}
                  </button>
                  <button
                    type="button"
                    disabled={!isCanEdit}
                    onClick={() => onRemove(row)}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                    {w.t("حذف", "Delete")}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
