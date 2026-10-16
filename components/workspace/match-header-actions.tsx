"use client";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import Link from "next/link";
import { Copy, Film, Presentation, Share2 } from "lucide-react";
import {
  analysisPath,
  relatedPresentations,
} from "@/features/workspace/header-context";
import { type Row } from "@/types/workspace";
import { useWorkspace } from "./provider";
import { rowLabel } from "./controls";

type Props = ComponentProps<"div"> & {
  match: Row;
  session?: Row;
  timeMs: number;
};
export const MatchHeaderActions = ({
  match,
  session,
  timeMs,
  ...props
}: Props) => {
  const w = useWorkspace();
  const host = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");
  const meetings = relatedPresentations(w.org, match.id, {
    presentations: w.list("presentations"),
    items: w.list("presentation_items"),
    clips: w.list("clips"),
    events: w.list("events"),
    evidence: w.list("evidence_links"),
  });
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (event.target instanceof Node && !host.current?.contains(event.target))
        host.current?.querySelectorAll("details").forEach((d) => {
          d.open = false;
        });
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);
  const escape = (event: React.KeyboardEvent<HTMLDetailsElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.currentTarget.open = false;
      event.currentTarget.querySelector("summary")?.focus();
    }
  };
  return (
    <div
      {...props}
      ref={host}
      data-slot="match-header-actions"
      className="match-header-buttons"
    >
      <span className="analysis-mode">
        <Film size={13} />
        {w.t("تحليل", "Analysis")}
      </span>
      <details className="match-header-menu" onKeyDown={escape}>
        <summary>
          <Presentation size={14} />
          {w.t("العرض", "Presentation")}
        </summary>
        <div className="match-header-popover">
          <b>
            {w.t("اجتماعات مرتبطة بالمباراة", "Meetings linked to this match")}
          </b>
          <small>
            {w.t(
              "الربط عبر المقاطع أو أدلة الأحداث، وليس عنوان الاجتماع.",
              "Linked through clips or event evidence, not meeting titles.",
            )}
          </small>
          {meetings.map((meeting) => (
            <Link
              key={meeting.id}
              href={`/meetings/${encodeURIComponent(meeting.id)}`}
            >
              {rowLabel(meeting)}
            </Link>
          ))}
          {!meetings.length && (
            <p>
              {w.t(
                "لا توجد اجتماعات مرتبطة بعد. أضف مقطعًا أو insight بأدلته إلى اجتماع.",
                "No linked meetings yet. Add a clip or evidence-backed insight to a meeting.",
              )}
            </p>
          )}
          <Link href="/meetings">{w.t("كل الاجتماعات", "All meetings")} →</Link>
        </div>
      </details>
      <details
        className="match-header-menu match-share-menu"
        onKeyDown={escape}
        onToggle={(event) => {
          if (event.currentTarget.open) {
            setUrl(
              `${window.location.origin}${analysisPath(match.id, session?.id ?? "", Math.round(timeMs))}`,
            );
            setMessage("");
          }
        }}
      >
        <summary>
          <Share2 size={14} />
          {w.t("مشاركة", "Share")}
        </summary>
        <div className="match-header-popover">
          <b>{w.t("مشاركة موضع التحليل", "Share analysis position")}</b>
          <label>
            {w.t("رابط المباراة والجلسة", "Match and session link")}
            <input
              dir="ltr"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
            />
          </label>
          <button
            disabled={!url}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setMessage(w.t("تم نسخ الرابط", "Link copied"));
              } catch {
                setMessage(
                  w.t(
                    "تعذر النسخ التلقائي؛ حدد الرابط وانسخه يدويًا.",
                    "Automatic copy unavailable; select and copy the link manually.",
                  ),
                );
              }
            }}
          >
            <Copy size={14} />
            {w.t("نسخ الرابط", "Copy link")}
          </button>
          <small>
            {w.t(
              "يتطلب حسابًا وصلاحية داخل المؤسسة. الملف المحلي لا ينتقل بالرابط؛ يحتاج المستلم إعادة ربطه. التعديلات المحلية المعلقة لن تظهر عنده حتى تتم مزامنتها.",
              "Requires sign-in and organization access. Local video is not transferred; the recipient must relink it. Pending local edits appear only after sync.",
            )}
          </small>
          <p role="status">{message}</p>
        </div>
      </details>
    </div>
  );
};
