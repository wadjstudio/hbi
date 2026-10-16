"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkspace } from "./provider";
import { Panel, Notice, SelectRow, rowLabel, useAction } from "./controls";
import { Entities } from "./entities";
import { TacticBoard } from "./tactics";
import Link from "next/link";
import { getLocalSource, registerLocalSource } from "@/lib/video/local-sources";
import { inspectVideo } from "@/lib/video/fingerprint";
import { s, n, type Row } from "@/types/workspace";
import { YouTubePlayerView } from "./youtube-player";
import { BrandLockup } from "@/components/brand/brand-lockup";
import {
  ArrowLeft,
  ArrowRight,
  Film,
  LayoutTemplate,
  Lightbulb,
  Maximize2,
  Plus,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { meetingItem } from "@/features/presentations/item";
import { canWrite } from "@/lib/permissions/roles";
import { formatTime } from "@/lib/video/time";
import { analysisLabel } from "@/features/analysis/labels";
export function Meetings() {
  const w = useWorkspace();
  return (
    <Entities
      table="presentations"
      title={w.t("اجتماعات الفريق", "Team meetings")}
    />
  );
}
export function ClipPlayer({
  clip,
  autoplay = false,
}: {
  clip: Row;
  autoplay?: boolean;
}) {
  const w = useWorkspace(),
    a = useAction(),
    ref = useRef<HTMLVideoElement>(null);
  const [url, setUrl] = useState("");
  const source = w
    .list("videos")
    .find(
      (v) =>
        v.id === clip.video_id &&
        v.organization_id === w.org &&
        clip.organization_id === w.org,
    );
  useEffect(() => {
    const update = () => {
      const linked = getLocalSource(`${w.user}:${w.org}`, s(clip.video_id));
      setUrl(linked || "");
    };
    queueMicrotask(update);
    window.addEventListener("hbi-local-source", update);
    return () => window.removeEventListener("hbi-local-source", update);
  }, [w.user, w.org, clip.video_id]);
  if (!source)
    return (
      <Notice>
        {w.t(
          "مصدر المقطع غير متاح في المؤسسة الحالية.",
          "Clip source unavailable in the current organization.",
        )}
      </Notice>
    );
  return (
    <div className="clip-player">
      <div className="meeting-clip-range">
        <span>{w.t("نطاق المقطع في المصدر", "Clip range in source")}</span>
        <b dir="ltr">
          {formatTime(n(clip.start_ms))} → {formatTime(n(clip.end_ms))}
        </b>
      </div>
      {a.error && <Notice>{a.error}</Notice>}
      {source?.storage_mode === "youtube" ? (
        <YouTubePlayerView
          key={clip.id}
          videoId={s(source.youtube_video_id)}
          startMs={n(clip.start_ms)}
          endMs={n(clip.end_ms)}
          autoplay={autoplay}
        />
      ) : url ? (
        <video
          ref={ref}
          controls
          autoPlay={autoplay}
          src={url}
          onLoadedMetadata={(e) => {
            e.currentTarget.currentTime = n(clip.start_ms) / 1000;
          }}
          onSeeking={(e) => {
            const video = e.currentTarget;
            if (video.currentTime < n(clip.start_ms) / 1000)
              video.currentTime = n(clip.start_ms) / 1000;
            else if (video.currentTime > n(clip.end_ms) / 1000)
              video.currentTime = n(clip.end_ms) / 1000;
          }}
          onTimeUpdate={(e) => {
            if (e.currentTarget.currentTime >= n(clip.end_ms) / 1000) {
              e.currentTarget.pause();
              e.currentTarget.currentTime = n(clip.start_ms) / 1000;
            }
          }}
        />
      ) : (
        <Notice>
          {w.t(
            "أعد ربط مصدر الفيديو لمشاهدة المقطع",
            "Relink source video to watch clip",
          )}
        </Notice>
      )}
      {source?.r2_object_key && (
        <button
          onClick={() =>
            void a.run(async () => {
              const response = await fetch("/api/r2/sign-read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ video_id: source.id }),
              });
              const data = await response.json();
              if (!response.ok) throw new Error(data.error);
              setUrl(data.url);
            })
          }
        >
          {w.t("تشغيل المصدر المشترك", "Play shared source")}
        </button>
      )}
      {source && source.storage_mode !== "youtube" && (
        <label className="file-button">
          {w.t("ربط المصدر", "Relink source")}
          <input
            type="file"
            accept="video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                void a.run(async () => {
                  const meta = await inspectVideo(file);
                  if (
                    meta.fingerprint !== source?.local_fingerprint ||
                    Math.abs(meta.duration - n(source?.duration_ms)) > 1000
                  ) {
                    URL.revokeObjectURL(meta.url);
                    throw new Error("Wrong source file");
                  }
                  registerLocalSource(
                    `${w.user}:${w.org}`,
                    s(clip.video_id),
                    meta.url,
                  );
                  setUrl(meta.url);
                });
            }}
          />
        </label>
      )}
    </div>
  );
}
export function Presentation({ id }: { id: string }) {
  const w = useWorkspace(),
    a = useAction();
  const [kind, setKind] = useState("clip"),
    [target, setTarget] = useState(""),
    [body, setBody] = useState(""),
    [note, setNote] = useState(""),
    [index, setIndex] = useState(0),
    [presenting, setPresenting] = useState(false),
    [autoplay, setAutoplay] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const wasFullscreen = useRef(false);
  const presentTrigger = useRef<HTMLButtonElement>(null);
  const [fullscreenNotice, setFullscreenNotice] = useState("");
  const presentation = w
      .list("presentations")
      .find((r) => r.id === id && r.organization_id === w.org),
    items = w
      .list("presentation_items")
      .filter((r) => r.presentation_id === id && r.organization_id === w.org)
      .sort((a, b) => n(a.position) - n(b.position)),
    selectedIndex = Math.min(index, Math.max(0, items.length - 1)),
    current = items[selectedIndex];
  const sources = {
    clips: w.list("clips"),
    tactics: w.list("tactic_documents"),
    insights: w.list("insights"),
  };
  const selected = meetingItem(w.org, current, sources);
  const kinds = {
    clip: w.t("مقطع فيديو", "Video clip"),
    tactic: w.t("لوحة تكتيكية", "Tactical board"),
    insight: w.t("استنتاج وأدلته", "Insight & evidence"),
    text: w.t("رسالة للفريق", "Team message"),
    missing: w.t("محتوى غير متاح", "Content unavailable"),
  };
  const writable = canWrite(w.role, "presentation_items") && !a.busy;
  const exit = useCallback(async () => {
    if (document.fullscreenElement === host.current) {
      try {
        await document.exitFullscreen();
      } catch {
        setFullscreenNotice(
          w.t(
            "تعذر الخروج من ملء الشاشة؛ استخدم Esc في المتصفح.",
            "Could not leave fullscreen; use the browser's Escape control.",
          ),
        );
        return;
      }
    }
    setPresenting(false);
    presentTrigger.current?.focus();
  }, [w]);
  useEffect(() => {
    const change = () => {
      if (document.fullscreenElement === host.current)
        wasFullscreen.current = true;
      else if (wasFullscreen.current) {
        wasFullscreen.current = false;
        setPresenting(false);
        presentTrigger.current?.focus();
      }
    };
    document.addEventListener("fullscreenchange", change);
    return () => document.removeEventListener("fullscreenchange", change);
  }, []);
  useEffect(() => {
    if (!presenting) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        void exit();
        return;
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
          host.current?.querySelectorAll<HTMLElement>(
            "button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),video[controls],summary,[tabindex='0']",
          ) ?? [],
        ).filter((node) => node.getClientRects().length > 0);
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          first &&
          last &&
          (e.shiftKey
            ? document.activeElement === first ||
              document.activeElement === host.current
            : document.activeElement === last)
        ) {
          e.preventDefault();
          (e.shiftKey ? last : first).focus();
        }
      }
      const target = e.target instanceof Element ? e.target : null;
      if (
        target?.closest(
          "input,textarea,select,button,a,summary,video,[contenteditable=true],[role=slider],[role=button]",
        )
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((i) => Math.min(Math.max(0, items.length - 1), i + 1));
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((i) =>
          Math.max(0, Math.min(i, Math.max(0, items.length - 1)) - 1),
        );
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [presenting, items.length, exit]);
  async function add() {
    await w.save("presentation_items", {
      presentation_id: id,
      position: Math.max(-1, ...items.map((r) => n(r.position))) + 1,
      ...(kind === "text"
        ? { body }
        : kind === "clip"
          ? { clip_id: target }
          : kind === "tactic"
            ? { tactic_id: target }
            : { insight_id: target }),
      speaker_note: note,
      autoplay,
    });
    setBody("");
    setNote("");
  }
  if (!presentation)
    return (
      <Notice>
        {w.t(
          "الاجتماع غير متاح في المؤسسة الحالية.",
          "Meeting unavailable in the current organization.",
        )}
      </Notice>
    );
  return (
    <div
      ref={host}
      tabIndex={-1}
      role={presenting ? "dialog" : undefined}
      aria-modal={presenting || undefined}
      aria-label={presenting ? w.t("اجتماع الفريق", "Team meeting") : undefined}
      data-slot="meeting-workbench"
      className={`meeting-workbench${presenting ? " presentation-stage" : ""}`}
    >
      {presenting && (
        <div className="presentation-brand">
          <BrandLockup />
          <span>{w.t("اجتماع الفريق", "Team meeting")}</span>
        </div>
      )}
      <Panel
        title={
          presentation ? rowLabel(presentation) : w.t("الاجتماع", "Meeting")
        }
        actions={
          <button
            ref={presentTrigger}
            disabled={!items.length}
            onClick={async () => {
              if (presenting) {
                await exit();
                return;
              }
              setPresenting(true);
              setFullscreenNotice("");
              host.current?.focus();
              try {
                if (!host.current?.requestFullscreen)
                  throw new Error("Fullscreen unavailable");
                await host.current.requestFullscreen();
              } catch {
                setFullscreenNotice(
                  w.t(
                    "وضع العرض نشط؛ ملء الشاشة غير متاح في هذا المتصفح.",
                    "Presentation mode is active; fullscreen is unavailable in this browser.",
                  ),
                );
              }
            }}
          >
            {presenting ? (
              <X size={16} aria-hidden="true" />
            ) : (
              <Maximize2 size={16} aria-hidden="true" />
            )}
            {presenting ? w.t("إنهاء", "Exit") : w.t("وضع العرض", "Present")}
          </button>
        }
      >
        {a.error && <Notice>{a.error}</Notice>}
        {presenting && fullscreenNotice && <Notice>{fullscreenNotice}</Notice>}
        <div className="meeting-layout">
          {!presenting && (
            <aside className="meeting-agenda">
              <h3>{w.t("جهّز اجتماع الفريق", "Prepare the team meeting")}</h3>
              <p>
                {items.length}{" "}
                {w.t(
                  "عناصر مرتبة · الفيديو يبقى على جهازك",
                  "ordered items · video stays on your device",
                )}
              </p>
              <form
                className="editor"
                onSubmit={(e) => {
                  e.preventDefault();
                  void a.run(add);
                }}
              >
                <div className="form-grid">
                  <select
                    aria-label={w.t("نوع المحتوى", "Content type")}
                    value={kind}
                    onChange={(e) => {
                      setKind(e.target.value);
                      setTarget("");
                    }}
                  >
                    {(["clip", "tactic", "insight", "text"] as const).map(
                      (k) => (
                        <option key={k} value={k}>
                          {kinds[k]}
                        </option>
                      ),
                    )}
                  </select>
                  {kind === "text" ? (
                    <textarea
                      aria-label={w.t("رسالة للفريق", "Team message")}
                      required
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                    />
                  ) : (
                    <SelectRow
                      label={w.t("المحتوى", "Content")}
                      rows={w.list(
                        kind === "clip"
                          ? "clips"
                          : kind === "tactic"
                            ? "tactic_documents"
                            : "insights",
                      )}
                      value={target}
                      onChange={setTarget}
                    />
                  )}
                  <label>
                    {w.t("ملاحظة المقدم", "Speaker note")}
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                  <label className="meeting-autoplay">
                    <input
                      type="checkbox"
                      checked={autoplay}
                      onChange={(e) => setAutoplay(e.target.checked)}
                    />
                    {w.t("تشغيل المقطع تلقائيًا", "Autoplay clip")}
                  </label>
                </div>
                <button
                  disabled={
                    !writable || (kind === "text" ? !body.trim() : !target)
                  }
                >
                  <Plus size={15} aria-hidden="true" />
                  {w.t("إضافة للعرض", "Add to meeting")}
                </button>
              </form>
              <div
                className="meeting-item-list"
                aria-label={w.t("ترتيب العرض", "Presentation sequence")}
              >
                {items.map((item, i) => (
                  <article key={item.id}>
                    <button
                      className="meeting-item-select"
                      aria-current={selectedIndex === i ? "step" : undefined}
                      onClick={() => setIndex(i)}
                    >
                      {i + 1} ·{" "}
                      {meetingItem(w.org, item, sources).kind === "missing"
                        ? kinds.missing
                        : s(item.body) ||
                          rowLabel(
                            w
                              .list(
                                item.clip_id
                                  ? "clips"
                                  : item.tactic_id
                                    ? "tactic_documents"
                                    : "insights",
                              )
                              .find(
                                (r) =>
                                  r.id ===
                                  (item.clip_id ||
                                    item.tactic_id ||
                                    item.insight_id),
                              ) ?? item,
                          )}
                    </button>
                    <button
                      aria-label={`${w.t("تحريك لأعلى", "Move up")} ${i + 1}`}
                      disabled={i === 0 || !writable}
                      onClick={() =>
                        void a.run(async () => {
                          const ids = items.map((r) => r.id);
                          [ids[i - 1], ids[i]] = [ids[i]!, ids[i - 1]!];
                          const { createClient } =
                            await import("@/lib/supabase/client");
                          const { error } = await createClient().rpc(
                            "reorder_items",
                            {
                              p_table: "presentation_items",
                              p_parent: id,
                              p_ids: ids,
                            },
                          );
                          if (error) throw new Error(error.message);
                          await w.reload();
                        })
                      }
                    >
                      ↑
                    </button>
                    <button
                      aria-label={`${w.t("حذف العنصر", "Remove item")} ${i + 1}`}
                      disabled={!writable}
                      onClick={() =>
                        void a.run(() =>
                          w.save("presentation_items", item, true),
                        )
                      }
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </div>
            </aside>
          )}
          <div className="meeting-preview">
            <div className="meeting-preview-heading">
              <span>
                {selected.kind === "clip" ? (
                  <Film size={17} aria-hidden="true" />
                ) : selected.kind === "tactic" ? (
                  <LayoutTemplate size={17} aria-hidden="true" />
                ) : selected.kind === "insight" ? (
                  <Lightbulb size={17} aria-hidden="true" />
                ) : (
                  <Type size={17} aria-hidden="true" />
                )}
                {kinds[selected.kind]}
              </span>
              <small>
                {presenting
                  ? w.t(
                      "أسهم لوحة المفاتيح للتنقل · Esc للخروج",
                      "Arrow keys to navigate · Esc to exit",
                    )
                  : w.t("معاينة العرض", "Presentation preview")}
              </small>
            </div>
            <div className="meeting-content">
              {selected.kind === "clip" && selected.target && (
                <ClipPlayer
                  key={current?.id}
                  clip={selected.target}
                  autoplay={Boolean(current?.autoplay)}
                />
              )}{" "}
              {selected.kind === "tactic" && selected.target && (
                <TacticBoard id={selected.target.id} editable={false} />
              )}{" "}
              {selected.kind === "insight" && selected.target && (
                <article className="meeting-insight">
                  <span className="meeting-insight-state">
                    {selected.target.is_reviewed
                      ? w.t("استنتاج مراجع", "Reviewed insight")
                      : w.t("الاستنتاج يحتاج المراجعة", "Insight needs review")}
                  </span>
                  <h2>{s(selected.target.title)}</h2>
                  <p>{s(selected.target.body)}</p>
                  <div
                    className="meeting-evidence-grid"
                    aria-label={w.t("أدلة الفيديو", "Video evidence")}
                  >
                    {w
                      .list("evidence_links")
                      .filter(
                        (link) =>
                          link.organization_id === w.org &&
                          link.insight_id === selected.target?.id &&
                          link.event_id,
                      )
                      .map((link) => {
                        const event = w
                          .list("events")
                          .find(
                            (e) =>
                              e.id === link.event_id &&
                              e.organization_id === w.org,
                          );
                        return event ? (
                          <div key={link.id}>
                            <Link
                              href={`/matches/${s(event.match_id)}?event=${event.id}`}
                            >
                              <span>
                                {w.t("شاهد الدليل", "Watch evidence")}
                              </span>
                              <b dir="ltr">
                                {typeof event.timestamp_ms === "number" &&
                                Number.isFinite(event.timestamp_ms) &&
                                event.timestamp_ms >= 0
                                  ? formatTime(event.timestamp_ms)
                                  : "—"}
                              </b>
                              <small>
                                {analysisLabel(s(event.event_type), w.lang)}
                              </small>
                            </Link>
                          </div>
                        ) : null;
                      })}
                  </div>
                </article>
              )}
              {selected.kind === "text" && current?.body && (
                <article className="meeting-text">{s(current.body)}</article>
              )}
              {selected.kind === "missing" && (
                <Notice>
                  {items.length
                    ? w.t(
                        "هذا العنصر أو مصدره غير متاح. راجع ترتيب العرض قبل الاجتماع.",
                        "This item or its content is unavailable. Check the sequence before the meeting.",
                      )
                    : w.t(
                        "أضف مقطعًا أو لوحة أو استنتاجًا أو رسالة لتجهيز العرض.",
                        "Add a clip, board, insight or message to prepare the presentation.",
                      )}
                </Notice>
              )}
            </div>
            <div className="toolbar meeting-navigation">
              <button
                disabled={selectedIndex === 0}
                onClick={() => setIndex(selectedIndex - 1)}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                {w.t("السابق", "Previous")}
              </button>
              <b>
                {items.length ? selectedIndex + 1 : 0}/{items.length}
              </b>
              <button
                disabled={selectedIndex >= items.length - 1}
                onClick={() => setIndex(selectedIndex + 1)}
              >
                {w.t("التالي", "Next")}
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
            {!presenting && current?.speaker_note && (
              <aside className="meeting-speaker-note">
                <b>
                  {w.t(
                    "ملاحظات المقدم · مخفية أثناء العرض",
                    "Speaker notes · hidden while presenting",
                  )}
                </b>
                <p>{s(current.speaker_note)}</p>
              </aside>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
export function Playlists({ id }: { id?: string }) {
  const router = useRouter();
  const w = useWorkspace(),
    a = useAction();
  const [clipId, setClip] = useState(""),
    [playlistId, setPlaylist] = useState(id ?? ""),
    [watch, setWatch] = useState<Row | null>(null),
    [note, setNote] = useState("");
  const pid = id || playlistId,
    items = w
      .list("playlist_items")
      .filter((r) => r.playlist_id === pid)
      .sort((a, b) => n(a.position) - n(b.position));
  return (
    <>
      {!id && (
        <Entities table="playlists" title={w.t("قوائم المقاطع", "Playlists")} />
      )}
      <Panel title={w.t("إعداد المقاطع للاجتماع", "Prepare meeting clips")}>
        <div className="form-grid">
          <SelectRow
            label={w.t("القائمة", "Playlist")}
            rows={w.list("playlists")}
            value={pid}
            onChange={setPlaylist}
          />
          <SelectRow
            label={w.t("المقطع", "Clip")}
            rows={w.list("clips")}
            value={clipId}
            onChange={setClip}
          />
          <label>
            {w.t("ملاحظة", "Coaching note")}
            <input value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </div>
        <button
          onClick={() =>
            void a.run(() =>
              w.save("playlist_items", {
                playlist_id: pid,
                clip_id: clipId,
                position: Math.max(-1, ...items.map((r) => n(r.position))) + 1,
                coach_note: note,
              }),
            )
          }
        >
          {w.t("إضافة", "Add")}
        </button>
        {a.error && <Notice>{a.error}</Notice>}
        <div className="entity-list">
          {items.map((item, i) => (
            <article key={item.id}>
              <button
                onClick={() =>
                  setWatch(
                    w.list("clips").find((c) => c.id === item.clip_id) ?? null,
                  )
                }
              >
                {rowLabel(
                  w.list("clips").find((c) => c.id === item.clip_id) ?? item,
                )}
              </button>
              <span>{s(item.coach_note)}</span>
              <button
                disabled={i === 0}
                onClick={() =>
                  void a.run(async () => {
                    const ids = items.map((r) => r.id);
                    [ids[i - 1], ids[i]] = [ids[i]!, ids[i - 1]!];
                    const { createClient } =
                      await import("@/lib/supabase/client");
                    const { error } = await createClient().rpc(
                      "reorder_items",
                      { p_table: "playlist_items", p_parent: pid, p_ids: ids },
                    );
                    if (error) throw new Error(error.message);
                    await w.reload();
                  })
                }
              >
                ↑
              </button>
              <button
                onClick={() =>
                  void a.run(() => w.save("playlist_items", item, true))
                }
              >
                ×
              </button>
            </article>
          ))}
        </div>
        {watch && <ClipPlayer key={watch.id} clip={watch} />}
        <details>
          <summary>{w.t("كل المقاطع", "All clips")}</summary>
          {w.list("clips").map((c) => (
            <button key={c.id} onClick={() => setWatch(c)}>
              {rowLabel(c)}
            </button>
          ))}
        </details>
        <button
          disabled={!items.length}
          onClick={() =>
            void a.run(async () => {
              const meeting = await w.save("presentations", {
                title: rowLabel(
                  w.list("playlists").find((p) => p.id === pid) ?? items[0]!,
                ),
              });
              for (const [i, item] of items.entries())
                await w.save("presentation_items", {
                  presentation_id: meeting.id,
                  position: i,
                  clip_id: item.clip_id,
                  speaker_note: item.coach_note ?? null,
                });
              router.push(`/meetings/${meeting.id}`);
            })
          }
        >
          {w.t("تحويل القائمة لاجتماع", "Create meeting from playlist")}
        </button>
      </Panel>
    </>
  );
}
