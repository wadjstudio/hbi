"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "./provider";
import { Panel, Notice, SelectRow, rowLabel, useAction } from "./controls";
import { Entities } from "./entities";
import { TacticBoard } from "./tactics";
import Link from "next/link";
import { getLocalSource, registerLocalSource } from "@/lib/video/local-sources";
import { inspectVideo } from "@/lib/video/fingerprint";
import { s, n, type Row } from "@/types/workspace";
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
  const source = w.list("videos").find((v) => v.id === clip.video_id);
  useEffect(() => {
    const update = () => {
      const linked = getLocalSource(`${w.user}:${w.org}`, s(clip.video_id));
      if (linked) setUrl(linked);
    };
    queueMicrotask(update);
    window.addEventListener("hbi-local-source", update);
    return () => window.removeEventListener("hbi-local-source", update);
  }, [w.user, w.org, clip.video_id]);
  return (
    <div className="clip-player">
      {a.error && <Notice>{a.error}</Notice>}
      {url ? (
        <video
          ref={ref}
          controls
          autoPlay={autoplay}
          src={url}
          onLoadedMetadata={(e) => {
            e.currentTarget.currentTime = n(clip.start_ms) / 1000;
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
  const presentation = w.list("presentations").find((r) => r.id === id),
    items = w
      .list("presentation_items")
      .filter((r) => r.presentation_id === id)
      .sort((a, b) => n(a.position) - n(b.position)),
    current = items[index];
  useEffect(() => {
    if (!presenting) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight")
        setIndex((i) => Math.min(items.length - 1, i + 1));
      if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "Escape") setPresenting(false);
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [presenting, items.length]);
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
  return (
    <div ref={host} className={presenting ? "presentation-stage" : ""}>
      <Panel
        title={
          presentation ? rowLabel(presentation) : w.t("الاجتماع", "Meeting")
        }
        actions={
          <button
            onClick={() => {
              setPresenting(!presenting);
              if (!presenting) void host.current?.requestFullscreen?.();
              else if (document.fullscreenElement)
                void document.exitFullscreen();
            }}
          >
            {presenting ? w.t("إنهاء", "Exit") : w.t("وضع العرض", "Present")}
          </button>
        }
      >
        {a.error && <Notice>{a.error}</Notice>}
        {!presenting && (
          <>
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
                  {["clip", "tactic", "insight", "text"].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
                {kind === "text" ? (
                  <textarea
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
                <label>
                  <input
                    type="checkbox"
                    checked={autoplay}
                    onChange={(e) => setAutoplay(e.target.checked)}
                  />
                  {w.t("تشغيل المقطع تلقائيًا", "Autoplay clip")}
                </label>
              </div>
              <button disabled={w.role === "viewer"}>
                {w.t("إضافة للعرض", "Add to meeting")}
              </button>
            </form>
            <div className="entity-list">
              {items.map((item, i) => (
                <article key={item.id}>
                  <button onClick={() => setIndex(i)}>
                    {i + 1} ·{" "}
                    {s(item.body) ||
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
                    disabled={i === 0}
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
                    onClick={() =>
                      void a.run(() => w.save("presentation_items", item, true))
                    }
                  >
                    ×
                  </button>
                </article>
              ))}
            </div>
          </>
        )}
        <div className="meeting-content">
          {current?.clip_id && (
            <ClipPlayer
              key={current.id}
              clip={w.list("clips").find((c) => c.id === current.clip_id)!}
              autoplay={Boolean(current.autoplay)}
            />
          )}{" "}
          {current?.tactic_id && (
            <TacticBoard id={s(current.tactic_id)} editable={false} />
          )}{" "}
          {current?.insight_id && (
            <article>
              <h2>
                {s(
                  w.list("insights").find((i) => i.id === current.insight_id)
                    ?.title,
                )}
              </h2>
              <p>
                {s(
                  w.list("insights").find((i) => i.id === current.insight_id)
                    ?.body,
                )}
              </p>
              {w
                .list("evidence_links")
                .filter(
                  (link) =>
                    link.insight_id === current.insight_id && link.event_id,
                )
                .map((link) => {
                  const event = w
                    .list("events")
                    .find((e) => e.id === link.event_id);
                  return event ? (
                    <p key={link.id}>
                      <Link
                        href={`/matches/${s(event.match_id)}?event=${event.id}`}
                      >
                        {w.t("شاهد الدليل", "Watch evidence")} ·{" "}
                        {s(event.event_type)}
                      </Link>
                    </p>
                  ) : null;
                })}
            </article>
          )}
          {current?.body && (
            <article className="meeting-text">{s(current.body)}</article>
          )}
        </div>
        <div className="toolbar">
          <button disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            {w.t("السابق", "Previous")}
          </button>
          <b>
            {items.length ? index + 1 : 0}/{items.length}
          </b>
          <button
            disabled={index >= items.length - 1}
            onClick={() => setIndex((i) => i + 1)}
          >
            {w.t("التالي", "Next")}
          </button>
        </div>
        {!presenting && current?.speaker_note && (
          <Notice>{s(current.speaker_note)}</Notice>
        )}
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
