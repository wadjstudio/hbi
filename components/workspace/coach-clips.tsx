"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "./provider";
import { Panel, useAction } from "./controls";
import { canWrite } from "@/lib/permissions/roles";
import { formatTime } from "@/lib/video/time";
import { s } from "@/types/workspace";
import { addCoachClipToMeeting, clipRange, coachClipSource, saveCoachClip, saveCoachMeeting, scopedCoachClips, type CoachClipScope } from "@/features/analysis/coach-clips";

export function CoachClips({ scope, timeMs, isAvailable, captureTime, onSeek }: {
  scope: CoachClipScope; timeMs: number; isAvailable: boolean; captureTime: () => number; onSeek: (ms: number) => void;
}) {
  const w = useWorkspace(), action = useAction(), locked = useRef(false);
  const [start, setStart] = useState(String(Math.max(0, timeMs - 8000) / 1000));
  const [end, setEnd] = useState(String(Math.min(Number(w.rows.videos?.find((r) => r.id === scope.videoId)?.duration_ms ?? 0), timeMs + 4000) / 1000));
  const [title, setTitle] = useState(""), [search, setSearch] = useState("");
  const [meetingId, setMeeting] = useState(""), [note, setNote] = useState(""), [meetingTitle, setMeetingTitle] = useState("");
  const [message, setMessage] = useState("");
  let duration = 0, clips: ReturnType<typeof scopedCoachClips> = [];
  try { duration = coachClipSource(scope, w.rows).durationMs; clips = scopedCoachClips(scope, w.rows); } catch { /* Source setup remains explicit below. */ }
  const canClip = duration > 0 && canWrite(w.role, "clips"), canMeeting = canWrite(w.role, "presentation_items");
  const meetings = w.list("presentations").filter((r) => r.organization_id === scope.organizationId);
  const meeting = meetings.find((r) => r.id === meetingId);
  const matchingClips = clips.filter((r) => s(r.title).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const excluded = w.list("clips").filter((r) => r.organization_id === scope.organizationId && r.video_id === scope.videoId).length - clips.length;
  let range: ReturnType<typeof clipRange> | null = null;
  try { range = clipRange(start, end, duration); } catch { /* Invalid draft stays editable. */ }
  const errorText = (error: unknown) => {
    const key = error instanceof Error ? error.message : "";
    if (key === "invalid_clip") return w.t("أدخل اسمًا وحدود لقطة صحيحة داخل مدة الفيديو؛ النهاية بعد البداية.", "Enter a title and valid source range; the end must follow the start.");
    if (key === "source_scope") return w.t("اختر جلسة مرتبطة بفيديو هذه المباراة أولًا.", "Select a session linked to this match video first.");
    if (key === "denied") return w.t("حسابك للقراءة فقط في هذه العملية.", "Your account cannot write this collection.");
    if (key === "stale_clip") return w.t("اللقطة المحفوظة تغيرت؛ راجعها قبل إنشاء نسخة باسم آخر.", "The saved clip changed; review it before creating a differently named copy.");
    if (key === "invalid_meeting") return w.t("راجع الاجتماع والمقطع وترتيب عناصره؛ لم نضف عنصرًا غير متوافق.", "Check the meeting, clip and item ordering; incompatible content was not added.");
    return w.t("تعذر الحفظ؛ تحقق من الجلسة وأعد المحاولة. المسودة ما زالت أمامك.", "Saving failed; check the session and retry. Your draft is retained.");
  };
  function run(task: () => Promise<unknown>) {
    if (locked.current) return;
    locked.current = true; setMessage("");
    void action.run(async () => { try { await task(); } catch (e) { throw new Error(errorText(e)); } finally { locked.current = false; } });
  }
  function mark(set: (v: string) => void) {
    try { set(String(Math.round(captureTime()) / 1000)); setMessage(""); } catch (e) { run(async () => { throw e; }); }
  }
  return <Panel title={w.t("لقطات المدرب والاجتماع", "Coach clips and meeting")}>
    <div data-slot="coach-clips">
      <p>{w.t("احفظ لقطة من الفيديو باسم واضح، ثم أضفها لاجتماع. اللقطة مرجع زمني؛ لا ترفع الفيديو ولا تُسجل هدفًا أو إحصاءً تلقائيًا.", "Save a named source interval, then add it to a meeting. A clip is a time reference; it uploads no video and creates no match statistics.")}</p>
      {!duration && <p className="notice">{w.t("اربط فيديو له مدة معروفة بجلسة هذه المباراة.", "Link a video with known duration to this match session.")}</p>}
      <form onSubmit={(e) => { e.preventDefault(); run(async () => {
        await saveCoachClip(scope, { title, ...clipRange(start, end, duration) }, { role: w.role, rows: w.rows, save: w.save });
        setMessage(w.t("اللقطة محفوظة في مساحة العمل؛ المزامنة تتم عند الاتصال.", "Clip saved in the workspace; synchronization runs when connected."));
      }); }}>
        <div className="form-grid">
          <label>{w.t("اسم اللقطة", "Clip title")}<input value={title} maxLength={160} required onChange={(e) => { setTitle(e.target.value); setMessage(""); }} disabled={!canClip || action.busy} /></label>
          <label>{w.t("البداية / ثانية من الفيديو", "Start / source seconds")}<input type="number" min="0" max={duration / 1000} step="0.001" value={start} onChange={(e) => { setStart(e.target.value); setMessage(""); }} disabled={!canClip || action.busy} required /></label>
          <label>{w.t("النهاية / ثانية من الفيديو", "End / source seconds")}<input type="number" min="0" max={duration / 1000} step="0.001" value={end} onChange={(e) => { setEnd(e.target.value); setMessage(""); }} disabled={!canClip || action.busy} required /></label>
        </div>
        <div className="toolbar">
          <button type="button" disabled={!canClip || !isAvailable || action.busy} onClick={() => mark(setStart)}>{w.t("حدد البداية هنا", "Mark start here")}</button>
          <button type="button" disabled={!canClip || !isAvailable || action.busy} onClick={() => mark(setEnd)}>{w.t("حدد النهاية هنا", "Mark end here")}</button>
          <button type="submit" disabled={!canClip || !range || !title.trim() || action.busy}>{w.t("حفظ اللقطة", "Save clip")}</button>
        </div>
        {!range && duration > 0 && <p className="notice">{w.t("النهاية يجب أن تأتي بعد البداية وداخل مدة المصدر.", "The end must follow the start and remain inside the source duration.")}</p>}
      </form>
      {action.error && <p role="alert">{action.error}</p>}{message && <p role="status">{message}</p>}
      <details><summary>{w.t("جهّز الاجتماع", "Prepare meeting")}</summary>
        <label>{w.t("الاجتماع المستهدف", "Target meeting")}<select value={meeting?.id ?? ""} onChange={(e) => { setMeeting(e.target.value); setMessage(""); }} disabled={!canMeeting || action.busy}>
          <option value="">—</option>{meetings.map((r) => <option value={r.id} key={r.id}>{s(r.title)}</option>)}
        </select></label>
        <label>{w.t("ملاحظة للمقدم عند إضافة اللقطة", "Presenter note for the added clip")}<textarea maxLength={2000} value={note} onChange={(e) => setNote(e.target.value)} disabled={!canMeeting || action.busy} /></label>
        {meeting && <Link href={`/meetings/${meeting.id}`}>{w.t("افتح الاجتماع", "Open meeting")} →</Link>}
        <form onSubmit={(e) => { e.preventDefault(); run(async () => {
          const created = await saveCoachMeeting(scope, meetingTitle, { role: w.role, rows: w.rows, save: w.save });
          setMeeting(created.id); setMeetingTitle(""); setMessage(w.t("الاجتماع محفوظ؛ اختر اللقطات التي تريد إضافتها.", "Meeting saved; choose the clips to add."));
        }); }}><label>{w.t("اسم اجتماع جديد", "New meeting title")}<input maxLength={160} value={meetingTitle} onChange={(e) => setMeetingTitle(e.target.value)} disabled={!canWrite(w.role, "presentations") || action.busy} /></label>
          <button disabled={!canWrite(w.role, "presentations") || !meetingTitle.trim() || action.busy}>{w.t("إنشاء اجتماع", "Create meeting")}</button></form>
      </details>
      <label>{w.t("ابحث في مقاطع هذا الفيديو", "Search this video's clips")}<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} /></label>
      {!clips.length && <p className="notice">{w.t("لم تحفظ لقطات لهذا الفيديو بعد. حدد نطاقًا واحفظ أول لقطة.", "No clips saved for this video yet. Mark a range and save the first clip.")}</p>}
      {clips.length > 0 && !matchingClips.length && <p className="notice">{w.t("لا توجد لقطات تطابق البحث الحالي.", "No clips match the current search.")}</p>}
      {excluded > 0 && <p className="notice">{excluded} {w.t("لقطات تحتاج مراجعة ارتباط المباراة أو حدود الزمن؛ لا يمكن إضافتها للاجتماع من هنا.", "clips need match-link or time-range review; they cannot be added to the meeting here.")}</p>}
      <div className="entity-list">{matchingClips.map((clip) => <article key={clip.id}>
        <strong>{s(clip.title)}</strong><span dir="ltr">{formatTime(Number(clip.start_ms))} → {formatTime(Number(clip.end_ms))}</span>
        <div className="toolbar"><button type="button" disabled={!isAvailable} onClick={() => onSeek(Number(clip.start_ms))}>{w.t("افتح البداية", "Open start")} · {s(clip.title)}</button>
          <button type="button" disabled={!isAvailable} onClick={() => onSeek(Math.max(Number(clip.start_ms), Number(clip.end_ms) - 1))}>{w.t("افتح النهاية", "Open end")} · {s(clip.title)}</button>
          <button type="button" disabled={!canMeeting || !meeting || action.busy} onClick={() => run(async () => {
            const result = await addCoachClipToMeeting(scope, clip.id, meetingId, note, { role: w.role, rows: w.rows, save: w.save });
            setMessage(result.added ? w.t("أضيفت اللقطة للاجتماع مع ملاحظة المقدم.", "Clip added to the meeting with its presenter note.") : w.t("اللقطة موجودة في الاجتماع بالفعل؛ لم نكررها أو نغير ملاحظتها.", "Clip already exists in the meeting; it was not duplicated or its note changed."));
          })}>{w.t("أضف للاجتماع", "Add to meeting")} · {s(clip.title)}</button></div>
      </article>)}</div>
    </div>
  </Panel>;
}
