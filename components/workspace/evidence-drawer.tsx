"use client";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Play, X, Plus, Pencil } from "lucide-react";
import { canWrite } from "@/lib/permissions/roles";
import { formatTime } from "@/lib/video/time";
import { n, s, type Row } from "@/types/workspace";
import { useWorkspace } from "./provider";
import { Notice, rowLabel, useAction } from "./controls";
import { evidenceSource } from "@/features/analysis/intelligence-scope";
import { getLocalSource } from "@/lib/video/local-sources";
import { matchLabel } from "./entities";

export function EvidenceDrawer({
  selection,
  onClose,
  onReview,
  onEdit,
  onClip,
  canClip,
  sessionId,
}: {
  selection: { title: string; events: Row[] } | null;
  onClose: () => void;
  onReview: (event: Row) => void;
  onEdit: (event: Row) => void;
  onClip: (event: Row) => Promise<Row>;
  canClip: (event: Row) => boolean;
  sessionId: string;
}) {
  const w = useWorkspace(),
    a = useAction(),
    ref = useRef<HTMLDialogElement>(null),
    titleId = useId();
  const [meeting, setMeeting] = useState("");
  const open = selection !== null;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  const writable = canWrite(w.role, "clips");
  async function addToMeeting(event: Row) {
    if (!w.list("presentations").some((p) => p.id === meeting))
      throw new Error("Choose a meeting");
    const clip = await onClip(event);
    const items = w
      .list("presentation_items")
      .filter((item) => item.presentation_id === meeting);
    if (items.some((item) => item.clip_id === clip.id)) return;
    await w.save("presentation_items", {
      presentation_id: meeting,
      clip_id: clip.id,
      position: Math.max(-1, ...items.map((item) => n(item.position))) + 1,
      speaker_note: s(event.note),
      autoplay: false,
    });
  }
  return (
    <dialog
      ref={ref}
      className="workbench-evidence"
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={onClose}
    >
      <header>
        <div>
          <span className="hbi-kicker">VIDEO EVIDENCE</span>
          <h2 id={titleId}>{selection?.title}</h2>
          <small>
            n={selection?.events.length ?? 0} ·{" "}
            {w.t(
              "أحداث من العينة المختارة · المصدر موضح لكل حدث",
              "events in the selected sample · source shown per event",
            )}
          </small>
        </div>
        <button
          aria-label={w.t("إغلاق الأدلة", "Close evidence")}
          onClick={onClose}
        >
          <X size={17} />
        </button>
      </header>
      {a.error && <Notice>{a.error}</Notice>}
      <label>
        {w.t("إضافة الأدلة إلى اجتماع", "Add evidence to a meeting")}
        <select value={meeting} onChange={(e) => setMeeting(e.target.value)}>
          <option value="">{w.t("اختر الاجتماع", "Choose meeting")}</option>
          {w.list("presentations").map((p) => (
            <option value={p.id} key={p.id}>
              {rowLabel(p)}
            </option>
          ))}
        </select>
      </label>
      <Link className="evidence-text" href="/meetings">
        {w.t("إنشاء أو إدارة الاجتماعات ↗", "Create or manage meetings ↗")}
      </Link>
      {selection?.events.length ? (
        selection.events.map((event) => {
          const source = evidenceSource(
            w.org,
            event,
            w.list("matches"),
            w.list("analysis_sessions"),
            w.list("videos"),
          );
          const isCurrent = source?.session.id === sessionId;
          const href = source
            ? `/matches/${source.match.id}?event=${event.id}`
            : "";
          const actor = w
              .list("players")
              .find((p) => p.id === event.actor_player_id),
            team = w.list("teams").find((t) => t.id === event.team_id);
          return (
            <article
              className="evidence-source"
              key={event.id}
              data-event-id={event.id}
            >
              <small className="evidence-origin">
                {source ? (
                  <>
                    {matchLabel(source.match, w.list("teams"))} ·{" "}
                    {s(source.match.starts_at).slice(0, 10) || "—"} ·{" "}
                    {rowLabel(source.session)}
                  </>
                ) : (
                  w.t(
                    "علاقة المصدر غير متوافقة",
                    "Source relationship is incompatible",
                  )
                )}
              </small>
              {source &&
                (!source.video ||
                  (source.video.storage_mode === "local" &&
                    !getLocalSource(
                      `${w.user}:${w.org}`,
                      source.video.id,
                    ))) && (
                  <small className="evidence-media-missing">
                    {w.t(
                      "الفيديو المحلي يحتاج إعادة ربط قبل المشاهدة",
                      "Local video needs relinking before viewing",
                    )}
                  </small>
                )}
              <div>
                <b dir="ltr">{formatTime(n(event.timestamp_ms))}</b>
                <span>{s(event.event_type)}</span>
                <small>
                  {team ? rowLabel(team) : "—"} ·{" "}
                  {actor
                    ? rowLabel(actor)
                    : w.t("المشارك غير مسجل", "Participant not recorded")}
                </small>
              </div>
              {event.note && <p>{s(event.note)}</p>}
              <div className="toolbar">
                {source && !isCurrent ? (
                  <Link
                    className="evidence-route"
                    href={href}
                    onClick={onClose}
                  >
                    <Play size={13} />
                    {w.t("فتح لقطة المصدر", "Open source moment")}
                  </Link>
                ) : (
                  <button
                    disabled={!source}
                    onClick={() => {
                      onReview(event);
                      onClose();
                    }}
                  >
                    <Play size={13} />
                    {w.t("مراجعة اللقطة", "Review moment")}
                  </button>
                )}
                {source && !isCurrent && canWrite(w.role, "events") ? (
                  <Link
                    className="evidence-route"
                    href={`${href}&edit=1`}
                    onClick={onClose}
                  >
                    <Pencil size={13} />
                    {w.t("فتح المصدر للتحرير", "Open source to edit")}
                  </Link>
                ) : (
                  <button
                    disabled={!source || !canWrite(w.role, "events")}
                    onClick={() => {
                      onEdit(event);
                      onClose();
                    }}
                  >
                    <Pencil size={13} />
                    {w.t("تحرير", "Edit")}
                  </button>
                )}
                <button
                  disabled={!writable || !canClip(event) || a.busy}
                  onClick={() => void a.run(() => onClip(event))}
                >
                  {w.t("مقطع دليل", "Evidence clip")}
                </button>
                <button
                  disabled={!meeting || !canClip(event) || !writable || a.busy}
                  className="primary"
                  onClick={() => void a.run(() => addToMeeting(event))}
                >
                  <Plus size={13} />
                  {w.t("للاجتماع", "To meeting")}
                </button>
              </div>
            </article>
          );
        })
      ) : (
        <p className="intelligence-empty">
          {w.t(
            "لا توجد أحداث داعمة في العينة الحالية.",
            "No supporting events in the current sample.",
          )}
        </p>
      )}
      <small>
        {w.t(
          "المقاطع مراجع زمنية للمصدر نفسه. إذا فقد الفيديو المحلي، أعد ربطه قبل العرض.",
          "Clips reference the same source by time. Relink a missing local video before presenting.",
        )}
      </small>
    </dialog>
  );
}
