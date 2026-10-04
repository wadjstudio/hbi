"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useWorkspace } from "./provider";
import { Panel, Notice, SelectRow, useAction, rowLabel } from "./controls";
import { DrawingEditor } from "./drawing";
import { EventParticipants } from "./event-participants";
import { ShotMap } from "./charts";
import { matchLabel } from "./entities";
import { getLocalSource, registerLocalSource } from "@/lib/video/local-sources";
import { inspectVideo } from "@/lib/video/fingerprint";
import { matchClock, formatTime } from "@/lib/video/time";
import {
  shotSummary,
  keeperSummary,
  percent,
  positionAt,
} from "@/lib/analytics/metrics";
import { s, n, positions, type Row, type Drawing } from "@/types/workspace";
type History = {
  event: Row;
  shot?: Row;
  previousEvent?: Row;
  previousShot?: Row;
  restoredEvent?: Row;
  restoredShot?: Row;
};
export function VideoWorkspace({
  matchId: initialMatch,
}: {
  matchId?: string;
}) {
  const w = useWorkspace(),
    a = useAction();
  const [matchId, setMatch] = useState(initialMatch ?? ""),
    [sessionId, setSession] = useState(""),
    [videoId, setVideo] = useState(""),
    [url, setUrl] = useState(""),
    [time, setTime] = useState(0),
    [tab, setTab] = useState("events");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const player = useRef<HTMLVideoElement>(null),
    source = useRef("");
  const undo = useRef<History[]>([]),
    redo = useRef<History[]>([]);
  const [annotationId, setAnnotationId] = useState(""),
    [annotationSnapshot, setAnnotationSnapshot] = useState<Row | null>(null),
    [annotationStart, setAnnotationStart] = useState(0),
    [annotationEnd, setAnnotationEnd] = useState(0),
    [templateId, setTemplate] = useState(""),
    [distance, setDistance] = useState(""),
    [shotType, setShotType] = useState(""),
    [rebound, setRebound] = useState("unknown"),
    [fastBreak, setFastBreak] = useState(false),
    [goalPoint, setGoalPoint] = useState<{ x: number; y: number } | null>(null);
  const [team, setTeam] = useState(""),
    [actor, setActor] = useState(""),
    [keeper, setKeeper] = useState(""),
    [eventType, setEventType] = useState("shot"),
    [result, setResult] = useState("goal"),
    [zone, setZone] = useState("center"),
    [empty, setEmpty] = useState(false),
    [note, setNote] = useState(""),
    [editId, setEdit] = useState(""),
    [editSnapshot, setEditSnapshot] = useState<{
      event: Row;
      shot: Row | undefined;
    } | null>(null),
    [phase, setPhase] = useState("positional_attack"),
    [terms, setTerms] = useState<string[]>([]);
  const [scoreFor, setScoreFor] = useState(""),
    [scoreAgainst, setScoreAgainst] = useState(""),
    [outcome, setOutcome] = useState("unknown");
  const [court, setCourt] = useState<{ x: number; y: number } | null>(null),
    [period, setPeriod] = useState(1),
    [clockStart, setClockStart] = useState(0),
    [segStart, setSegStart] = useState(0),
    [segEnd, setSegEnd] = useState(0),
    [running, setRunning] = useState(true);
  const [starting, setStarting] = useState(true),
    [outPlayer, setOut] = useState(""),
    [inPlayer, setIn] = useState(""),
    [position, setPosition] = useState("CB"),
    [numericalFor, setNumericalFor] = useState(6),
    [numericalAgainst, setNumericalAgainst] = useState(6),
    [annotation, setAnnotation] = useState<Drawing[]>([]),
    [annotate, setAnnotate] = useState(false),
    [filter, setFilter] = useState("all"),
    [participantFilter, setParticipantFilter] = useState(""),
    [pre, setPre] = useState(8),
    [post, setPost] = useState(4);
  const match = w.list("matches").find((r) => r.id === matchId),
    sessions = w
      .list("analysis_sessions")
      .filter((r) => r.match_id === matchId),
    session =
      sessions.find((r) => r.id === sessionId) ??
      sessions.find((r) => r.is_primary),
    sid = session?.id ?? "",
    video = w
      .list("videos")
      .find((r) => r.id === (videoId || session?.video_id));
  const events = w
      .list("events")
      .filter((r) => r.analysis_session_id === sid)
      .sort((a, b) => n(a.timestamp_ms) - n(b.timestamp_ms)),
    eventIds = new Set(events.map((e) => e.id)),
    shots = w.list("shot_attempts").filter((r) => eventIds.has(s(r.event_id))),
    possessions = w
      .list("possessions")
      .filter((r) => r.analysis_session_id === sid),
    open = possessions.find((r) => r.end_ms == null),
    segments = w
      .list("video_clock_segments")
      .filter((r) => r.analysis_session_id === sid),
    clock = matchClock(segments, time),
    intervals = w
      .list("on_court_intervals")
      .filter((r) => r.analysis_session_id === sid),
    annotations = w
      .list("video_annotations")
      .filter(
        (r) =>
          r.analysis_session_id === sid &&
          n(r.start_ms) <= time &&
          time < n(r.end_ms),
      );
  const roster = w.list("match_roster").filter((r) => r.match_id === matchId),
    players = w
      .list("players")
      .filter((p) =>
        roster.some((r) => r.player_id === p.id && r.team_id === team),
      ),
    keepers = w
      .list("players")
      .filter((p) =>
        roster.some((r) => r.player_id === p.id && r.team_id !== team),
      ),
    teams = w
      .list("teams")
      .filter(
        (r) => r.id === match?.home_team_id || r.id === match?.away_team_id,
      ),
    filtered = events.filter(
      (e) =>
        (filter === "all" || e.event_type === filter) &&
        (!participantFilter || e.actor_player_id === participantFilter),
    );
  useEffect(() => {
    const linked = getLocalSource(`${w.user}:${w.org}`, video?.id ?? "");
    if (linked) queueMicrotask(() => setUrl(linked));
  }, [video?.id, w.user, w.org]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("event");
    if (id) {
      const e = events.find((r) => r.id === id);
      if (e) {
        queueMicrotask(() => {
          setTime(n(e.timestamp_ms));
          if (player.current)
            player.current.currentTime = n(e.timestamp_ms) / 1000;
          setEdit(id);
          setEditSnapshot({
            event: e,
            shot: shots.find((r) => r.event_id === e.id),
          });
        });
      }
    }
    // Open evidence once when entering this session; later refreshes preserve the editing snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sid]);
  function clearEditing() {
    setEdit("");
    setEditSnapshot(null);
    setAnnotate(false);
    setAnnotationSnapshot(null);
    setAnnotationId("");
    setAnnotation([]);
    undo.current = [];
    redo.current = [];
  }
  function seek(ms: number) {
    setTime(ms);
    if (player.current) player.current.currentTime = ms / 1000;
  }
  function base(): Partial<Row> {
    if (!sid) throw new Error(w.t("اربط فيديو أولًا", "Attach video first"));
    return {
      analysis_session_id: sid,
      match_id: matchId,
      team_id: team || match?.home_team_id,
      period: clock?.period ?? period,
    };
  }
  async function attach(file: File) {
    if (!match) throw new Error("Select match");
    const meta = await inspectVideo(file);
    if (
      video?.local_fingerprint &&
      (video.local_fingerprint !== meta.fingerprint ||
        Math.abs(n(video.duration_ms) - meta.duration) > 1000)
    ) {
      URL.revokeObjectURL(meta.url);
      throw new Error(
        w.t("الملف مختلف عن المصدر المسجل", "File differs from saved source"),
      );
    }
    let v = video;
    if (!v)
      v = await w.save("videos", {
        match_id: matchId,
        storage_mode: "local",
        status: "ready",
        original_filename: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
        duration_ms: meta.duration,
        width: meta.width,
        height: meta.height,
        local_fingerprint: meta.fingerprint,
      });
    if (!session) {
      const created = await w.save("analysis_sessions", {
        match_id: matchId,
        video_id: v.id,
        title: matchLabel(match, w.list("teams")),
        is_primary: !sessions.some((r) => r.is_primary),
      });
      setSession(created.id);
    }
    setVideo(v.id);
    setSegEnd(meta.duration / 1000);
    registerLocalSource(`${w.user}:${w.org}`, v.id, meta.url);
    setSourceFile(file);
    source.current = meta.url;
    setUrl(meta.url);
    setTeam(s(match.home_team_id));
  }
  async function record(selectedType = eventType) {
    if (!team) throw new Error("Select team");
    const existing =
      editSnapshot?.event.id === editId
        ? editSnapshot.event
        : events.find((r) => r.id === editId);
    const oldShot =
      editSnapshot?.event.id === editId
        ? editSnapshot.shot
        : shots.find((r) => r.event_id === editId);
    const e = await w.save("events", {
      ...existing,
      ...base(),
      timestamp_ms: existing?.timestamp_ms ?? Math.round(time),
      match_clock_ms: clock?.clockMs ?? null,
      event_type: selectedType,
      outcome:
        selectedType === "shot"
          ? result === "goal"
            ? "success"
            : result === "unknown"
              ? "unknown"
              : "failure"
          : outcome,
      score_for: scoreFor === "" ? null : Number(scoreFor),
      score_against: scoreAgainst === "" ? null : Number(scoreAgainst),
      actor_player_id: actor || null,
      actor_position:
        actor && clock
          ? positionAt(intervals, actor, clock.period, clock.clockMs)
          : null,
      possession_id: existing?.possession_id ?? open?.id ?? null,
      phase,
      note,
      numerical_for: numericalFor,
      numerical_against: numericalAgainst,
    });
    let sh: Row | undefined;
    if (selectedType === "shot")
      sh = await w.save("shot_attempts", {
        ...oldShot,
        event_id: e.id,
        shooter_id: actor || null,
        goalkeeper_id: empty ? null : keeper || null,
        shooter_position: e.actor_position,
        result,
        empty_goal: empty,
        zone,
        court_x: court?.x ?? null,
        court_y: court?.y ?? null,
        goal_x: goalPoint?.x ?? null,
        goal_y: goalPoint?.y ?? null,
        distance_m: distance ? Number(distance) : null,
        shot_type_id: shotType || null,
        rebound,
        starts_fast_break: fastBreak,
        review_required: result === "unknown",
      });
    else if (oldShot) await w.save("shot_attempts", oldShot, true);
    undo.current.push({
      event: e,
      shot: sh,
      previousEvent: existing,
      previousShot: oldShot,
    });
    redo.current = [];
    setEdit("");
    setNote("");
  }
  async function history(direction: "undo" | "redo") {
    const item = (direction === "undo" ? undo : redo).current.pop();
    if (!item) return;
    if (direction === "undo") {
      if (item.previousEvent) {
        item.restoredEvent = await w.save("events", {
          ...item.previousEvent,
          revision: item.event.revision,
        });
        if (item.previousShot)
          item.restoredShot = await w.save("shot_attempts", {
            ...item.previousShot,
            revision: item.shot?.revision ?? 0,
          });
        else if (item.shot) await w.save("shot_attempts", item.shot, true);
      } else {
        if (item.shot) await w.save("shot_attempts", item.shot, true);
        await w.save("events", item.event, true);
        item.restoredEvent = undefined;
        item.restoredShot = undefined;
      }
      redo.current.push(item);
    } else {
      item.event = await w.save("events", {
        ...item.event,
        revision: item.restoredEvent?.revision ?? 0,
      });
      if (item.shot)
        item.shot = await w.save("shot_attempts", {
          ...item.shot,
          revision: item.restoredShot?.revision ?? 0,
        });
      else if (item.restoredShot)
        await w.save("shot_attempts", item.restoredShot, true);
      undo.current.push(item);
    }
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (player.current?.paused) void player.current.play();
        else player.current?.pause();
      }
      if (e.key === "ArrowLeft") seek(Math.max(0, time - 5000));
      if (e.key === "ArrowRight")
        seek(Math.min(n(video?.duration_ms), time + 5000));
      const quick = (
        (w.list("tagging_templates").find((r) => r.id === templateId)
          ?.buttons ?? []) as {
          key: string;
          event_type: string;
          pre_seconds: number;
          post_seconds: number;
        }[]
      ).find((b) => b.key && b.key === e.key.toLowerCase());
      if (quick && !e.ctrlKey) {
        setPre(quick.pre_seconds);
        setPost(quick.post_seconds);
        void a.run(() => record(quick.event_type));
      } else if (e.key.toLowerCase() === "t" && !e.ctrlKey) void a.run(record);
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        void a.run(() => history("undo"));
      }
      if (e.ctrlKey && e.key === "y") {
        e.preventDefault();
        void a.run(() => history("redo"));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  async function clip(e?: Row) {
    if (!video) throw new Error("Video missing");
    const ms = e ? n(e.timestamp_ms) : time;
    const c = await w.save("clips", {
      video_id: video.id,
      match_id: matchId,
      title: e ? `${s(e.event_type)} ${formatTime(ms)}` : formatTime(ms),
      start_ms: Math.max(0, Math.round(ms - pre * 1000)),
      end_ms: Math.min(n(video.duration_ms), Math.round(ms + post * 1000)),
    });
    if (e) await w.save("evidence_links", { clip_id: c.id, event_id: e.id });
    return c;
  }
  function edit(e: Row) {
    setEditSnapshot({ event: e, shot: shots.find((r) => r.event_id === e.id) });
    seek(n(e.timestamp_ms));
    setEdit(e.id);
    setActor(s(e.actor_player_id));
    setTeam(s(e.team_id));
    setEventType(s(e.event_type));
    setNote(s(e.note));
    setScoreFor(s(e.score_for));
    setScoreAgainst(s(e.score_against));
    setOutcome(s(e.outcome) || "unknown");
    setPhase(s(e.phase) || "positional_attack");
    setNumericalFor(n(e.numerical_for ?? 6));
    setNumericalAgainst(n(e.numerical_against ?? 6));
    const sh = shots.find((r) => r.event_id === e.id);
    if (sh) {
      setResult(s(sh.result));
      setKeeper(s(sh.goalkeeper_id));
      setEmpty(Boolean(sh.empty_goal));
      setZone(s(sh.zone));
      setCourt(
        sh.court_x != null ? { x: n(sh.court_x), y: n(sh.court_y) } : null,
      );
      setGoalPoint(
        sh.goal_x != null ? { x: n(sh.goal_x), y: n(sh.goal_y) } : null,
      );
      setShotType(s(sh.shot_type_id));
      setDistance(s(sh.distance_m));
      setRebound(s(sh.rebound) || "unknown");
      setFastBreak(Boolean(sh.starts_fast_break));
    }
  }
  const summary = shotSummary(shots);
  const missingAttempts = events.filter(
    (e) =>
      [
        "shot",
        "goal",
        "save",
        "miss",
        "blocked_shot",
        "seven_meter_shot",
      ].includes(s(e.event_type)) && !shots.some((sh) => sh.event_id === e.id),
  ).length;
  const pausedLayers = useRef(new Set<string>());
  useEffect(() => {
    const active = (w.rows.video_annotations ?? []).filter(
      (r) =>
        r.analysis_session_id === sid &&
        n(r.start_ms) <= time &&
        time < n(r.end_ms),
    );
    for (const layer of active)
      if (layer.pause_on_entry && !pausedLayers.current.has(layer.id)) {
        player.current?.pause();
        pausedLayers.current.add(layer.id);
      }
    for (const id of pausedLayers.current)
      if (!active.some((r) => r.id === id)) pausedLayers.current.delete(id);
  }, [time, sid, w.rows]);
  return (
    <div className="video-workspace">
      <div className="page-title">
        <h1>
          {match
            ? matchLabel(match, w.list("teams"))
            : w.t("معمل الفيديو", "Video Lab")}
        </h1>
        <SelectRow
          label={w.t("المباراة", "Match")}
          rows={w
            .list("matches")
            .map((r) => ({ ...r, title: matchLabel(r, w.list("teams")) }))}
          value={matchId}
          onChange={(id) => {
            clearEditing();
            setMatch(id);
            setSession("");
            setVideo("");
            setUrl("");
            setSourceFile(null);
            source.current = "";
            setTime(0);
          }}
        />
      </div>
      {a.error && <Notice>{a.error}</Notice>}
      {missingAttempts > 0 && (
        <Notice>
          {w.t(
            "أحداث تصويب تحتاج استكمال نتيجة المحاولة",
            "Shot events need an attempt result",
          )}{" "}
          · {missingAttempts}
        </Notice>
      )}
      <div className="toolbar">
        <SelectRow
          label={w.t("جلسة التحليل", "Analysis session")}
          rows={sessions}
          value={sid}
          onChange={(id) => {
            clearEditing();
            setSession(id);
            setVideo("");
            setUrl("");
            setSourceFile(null);
          }}
        />
        <button
          disabled={!video}
          onClick={() =>
            void a.run(async () => {
              const session = await w.save("analysis_sessions", {
                match_id: matchId,
                video_id: video?.id,
                title: `Analysis ${sessions.length + 1}`,
                is_primary: false,
              });
              clearEditing();
              setSession(session.id);
            })
          }
        >
          {w.t("جلسة إضافية", "Additional session")}
        </button>
        <button
          disabled={!sid || !w.online}
          onClick={() =>
            void a.run(async () => {
              await w.flush();
              const { createClient } = await import("@/lib/supabase/client");
              const { error } = await createClient().rpc(
                "set_primary_analysis",
                { p_session: sid },
              );
              if (error) throw new Error(error.message);
              await w.reload();
            })
          }
        >
          {w.t("اعتماد للتحليلات المجمعة", "Use for aggregate analytics")}
        </button>
      </div>
      <div className="analysis-grid">
        <Panel
          title={w.t("الفيديو والتحليل", "Video analysis")}
          actions={
            <label className="file-button">
              {url
                ? w.t("إعادة ربط", "Relink")
                : w.t("اختيار فيديو محلي", "Select local video")}
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void a.run(() => attach(f));
                }}
              />
            </label>
          }
        >
          <div
            className="video-surface"
            style={{
              aspectRatio:
                video?.width && video?.height
                  ? `${video.width}/${video.height}`
                  : "16/9",
            }}
          >
            {url ? (
              <video
                ref={player}
                src={url}
                controls
                onTimeUpdate={(e) =>
                  setTime(Math.round(e.currentTarget.currentTime * 1000))
                }
              />
            ) : (
              <div className="video-empty">
                <b>HBI</b>
                <p>
                  {w.t(
                    "الفيديو يبقى على جهازك. اختر المصدر أو أعد ربطه.",
                    "Video stays on your device. Select or relink the source.",
                  )}
                </p>
              </div>
            )}
            {annotations.map((layer) => (
              <DrawingEditor
                key={layer.id}
                objects={layer.objects as unknown as Drawing[]}
                onChange={() => {}}
                overlay
                editable={false}
              />
            ))}
            {annotate && (
              <DrawingEditor
                objects={annotation}
                onChange={setAnnotation}
                overlay
              />
            )}
          </div>
          <div className="toolbar">
            {video?.r2_object_key && (
              <button
                onClick={() =>
                  void a.run(async () => {
                    const response = await fetch("/api/r2/sign-read", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ video_id: video.id }),
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
            <button
              disabled={!sourceFile || !video || !w.online}
              onClick={() =>
                void a.run(async () => {
                  if (!video || !sourceFile) throw new Error("Relink source");
                  await w.flush();
                  const response = await fetch("/api/r2/sign-upload", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ video_id: video.id }),
                  });
                  const signed = await response.json();
                  if (!response.ok) throw new Error(signed.error);
                  const uploaded = await fetch(signed.url, {
                    method: "PUT",
                    headers: { "Content-Type": sourceFile.type || "video/mp4" },
                    body: sourceFile,
                  });
                  if (!uploaded.ok) throw new Error("Upload failed");
                  const completed = await fetch("/api/r2/complete", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ video_id: video.id }),
                  });
                  if (!completed.ok)
                    throw new Error((await completed.json()).error);
                  await w.reload();
                })
              }
            >
              {w.t("مشاركة الفيديو عبر R2", "Share video through R2")}
            </button>
            <b>
              {formatTime(time)} / {formatTime(n(video?.duration_ms))}
            </b>
            <span>
              {clock
                ? `${w.t("الشوط", "Period")} ${clock.period} · ${formatTime(clock.clockMs)}`
                : w.t("ساعة المباراة غير معايرة", "Match clock not calibrated")}
            </span>
            <button
              onClick={() => {
                player.current?.pause();
                setAnnotate(!annotate);
                setAnnotationSnapshot(null);
                setAnnotationId("");
                setAnnotationStart(time / 1000);
                setAnnotationEnd(
                  Math.min(n(video?.duration_ms), time + 5000) / 1000,
                );
              }}
            >
              {w.t("رسم على الفيديو", "Telestration")}
            </button>
            {annotate && (
              <>
                <label>
                  {w.t("يظهر من / ثانية", "Visible from / sec")}
                  <input
                    type="number"
                    min="0"
                    step=".1"
                    value={annotationStart}
                    onChange={(e) => setAnnotationStart(Number(e.target.value))}
                  />
                </label>
                <label>
                  {w.t("يظهر حتى / ثانية", "Visible until / sec")}
                  <input
                    type="number"
                    min="0"
                    step=".1"
                    max={n(video?.duration_ms) / 1000}
                    value={annotationEnd}
                    onChange={(e) => setAnnotationEnd(Number(e.target.value))}
                  />
                </label>
                <button
                  onClick={() =>
                    void a.run(async () => {
                      if (!video || !sid) throw new Error("Attach source");
                      await w.save("video_annotations", {
                        ...annotationSnapshot,
                        id: annotationId || undefined,
                        video_id: video.id,
                        analysis_session_id: sid,
                        start_ms: Math.round(annotationStart * 1000),
                        end_ms: Math.round(annotationEnd * 1000),
                        pause_on_entry: true,
                        objects: annotation,
                      });
                      setAnnotate(false);
                      setAnnotationId("");
                      setAnnotation([]);
                    })
                  }
                >
                  {w.t("حفظ الرسم", "Save drawing")}
                </button>
              </>
            )}
          </div>
          <div className="timeline">
            {events.map((e) => (
              <button
                key={e.id}
                title={`${e.event_type} ${formatTime(n(e.timestamp_ms))}`}
                style={{
                  left: `${(100 * n(e.timestamp_ms)) / Math.max(1, n(video?.duration_ms))}%`,
                }}
                onClick={() => edit(e)}
              />
            ))}
          </div>
          <div className="toolbar">
            <button onClick={() => void a.run(() => history("undo"))}>
              {w.t("تراجع", "Undo")}
            </button>
            <button onClick={() => void a.run(() => history("redo"))}>
              {w.t("إعادة", "Redo")}
            </button>
            <button onClick={() => void a.run(() => clip())}>
              {w.t("إنشاء مقطع", "Create clip")}
            </button>
            <label>
              {w.t("قبل / ثانية", "Pre / seconds")}
              <input
                type="number"
                min="0"
                max="60"
                value={pre}
                onChange={(e) => setPre(Number(e.target.value))}
              />
            </label>
            <label>
              {w.t("بعد / ثانية", "Post / seconds")}
              <input
                type="number"
                min="1"
                max="60"
                value={post}
                onChange={(e) => setPost(Number(e.target.value))}
              />
            </label>
          </div>
          <details>
            <summary>
              {w.t("معايرة ساعة المباراة", "Calibrate match clock")}
            </summary>
            <form
              className="editor form-grid"
              onSubmit={(e) => {
                e.preventDefault();
                void a.run(() =>
                  w.save("video_clock_segments", {
                    analysis_session_id: sid,
                    period,
                    video_start_ms: Math.round(segStart * 1000),
                    video_end_ms: Math.round(segEnd * 1000),
                    clock_start_ms: Math.round(clockStart * 1000),
                    running,
                  }),
                );
              }}
            >
              <label>
                {w.t("الشوط", "Period")}
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={period}
                  onChange={(e) => setPeriod(Number(e.target.value))}
                />
              </label>
              <label>
                {w.t("بداية الفيديو / ثانية", "Video start / sec")}
                <input
                  type="number"
                  min="0"
                  value={segStart}
                  step={0.001}
                  onChange={(e) => setSegStart(Number(e.target.value))}
                />
              </label>
              <label>
                {w.t("نهاية الفيديو / ثانية", "Video end / sec")}
                <input
                  type="number"
                  min="0"
                  value={segEnd}
                  step={0.001}
                  onChange={(e) => setSegEnd(Number(e.target.value))}
                />
              </label>
              <label>
                {w.t("ساعة الشوط / ثانية", "Period clock / sec")}
                <input
                  type="number"
                  min="0"
                  value={clockStart}
                  step={0.001}
                  onChange={(e) => setClockStart(Number(e.target.value))}
                />
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={running}
                  onChange={(e) => setRunning(e.target.checked)}
                />
                {w.t("الساعة تعمل", "Clock running")}
              </label>
              <button>{w.t("إضافة مقطع معايرة", "Add clock segment")}</button>
            </form>
            {segments.map((r) => (
              <div key={r.id}>
                {formatTime(n(r.video_start_ms))} →{" "}
                {formatTime(n(r.video_end_ms))} · {n(r.period)}{" "}
                <button
                  onClick={() =>
                    void a.run(() => w.save("video_clock_segments", r, true))
                  }
                >
                  ×
                </button>
              </div>
            ))}
          </details>
        </Panel>
        <Panel
          title={
            editId
              ? w.t("تعديل الحدث", "Edit event")
              : w.t("تسجيل سريع", "Quick tag")
          }
        >
          <SelectRow
            label={w.t("قالب التسجيل", "Tagging template")}
            rows={w.list("tagging_templates")}
            value={templateId}
            onChange={setTemplate}
          />
          <div className="toolbar">
            {(
              (w.list("tagging_templates").find((r) => r.id === templateId)
                ?.buttons ?? []) as {
                label: string;
                event_type: string;
                pre_seconds: number;
                post_seconds: number;
              }[]
            ).map((button, i) => (
              <button
                key={i}
                onClick={() => {
                  setEventType(button.event_type);
                  setPre(button.pre_seconds);
                  setPost(button.post_seconds);
                }}
              >
                {button.label}
              </button>
            ))}
          </div>
          <form
            className="editor"
            onSubmit={(e) => {
              e.preventDefault();
              void a.run(record);
            }}
          >
            <div className="form-grid">
              <SelectRow
                label={w.t("الفريق", "Team")}
                rows={teams}
                value={team}
                onChange={(v) => {
                  setTeam(v);
                  setActor("");
                  setKeeper("");
                }}
              />
              <SelectRow
                label={w.t("اللاعب", "Player")}
                rows={players}
                value={actor}
                onChange={setActor}
              />
              <label>
                {w.t("الحدث", "Event")}
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                >
                  {[
                    "shot",
                    "assist",
                    "turnover",
                    "steal",
                    "block",
                    "duel",
                    "seven_meter_won",
                    "two_minute_penalty",
                    "offensive_foul",
                    "defensive_foul",
                    "timeout",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              <label>
                {w.t("المرحلة", "Phase")}
                <select
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                >
                  {[
                    "positional_attack",
                    "fast_break",
                    "second_wave",
                    "transition_defense",
                    "set_defense",
                    "seven_vs_six",
                    "empty_goal",
                    "power_play",
                    "short_handed",
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
              {eventType === "shot" && (
                <>
                  <label>
                    {w.t("النتيجة", "Result")}
                    <select
                      value={result}
                      onChange={(e) => setResult(e.target.value)}
                    >
                      {["goal", "save", "miss", "blocked", "unknown"].map(
                        (v) => (
                          <option key={v}>{v}</option>
                        ),
                      )}
                    </select>
                  </label>
                  <SelectRow
                    label={w.t("الحارس", "Goalkeeper")}
                    rows={keepers}
                    value={keeper}
                    onChange={setKeeper}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={empty}
                      onChange={(e) => setEmpty(e.target.checked)}
                    />
                    {w.t("مرمى خالٍ", "Empty goal")}
                  </label>
                  <SelectRow
                    label={w.t("نوع التصويب", "Shot type")}
                    rows={w
                      .list("tactical_terms")
                      .filter((r) => r.category === "shot_type")
                      .map((r) => ({
                        ...r,
                        title: s(w.lang === "ar" ? r.label_ar : r.label_en),
                      }))}
                    value={shotType}
                    onChange={setShotType}
                  />
                  <label>
                    {w.t("المسافة / متر", "Distance / m")}
                    <input
                      type="number"
                      min="0"
                      step=".1"
                      value={distance}
                      onChange={(e) => setDistance(e.target.value)}
                    />
                  </label>
                  <label>
                    {w.t("الكرة المرتدة", "Rebound")}
                    <select
                      value={rebound}
                      onChange={(e) => setRebound(e.target.value)}
                    >
                      {[
                        "unknown",
                        "attacking_team",
                        "defending_team",
                        "out",
                      ].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={fastBreak}
                      onChange={(e) => setFastBreak(e.target.checked)}
                    />
                    {w.t("بدأ هجومًا سريعًا", "Started fast break")}
                  </label>
                  <label>
                    {w.t("المنطقة", "Zone")}
                    <select
                      value={zone}
                      onChange={(e) => setZone(e.target.value)}
                    >
                      {[
                        "lw",
                        "left_half",
                        "center",
                        "right_half",
                        "rw",
                        "pivot_left",
                        "pivot_center",
                        "pivot_right",
                        "seven_meter",
                        "nine_meter_left",
                        "nine_meter_center",
                        "nine_meter_right",
                      ].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {eventType !== "shot" && (
                <label>
                  {w.t("نتيجة الإجراء", "Action outcome")}
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                  >
                    {["success", "failure", "neutral", "unknown"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                {w.t("أهداف الفريق وقت التسجيل", "Team score at observation")}
                <input
                  type="number"
                  min="0"
                  max="32767"
                  value={scoreFor}
                  onChange={(e) => setScoreFor(e.target.value)}
                />
              </label>
              <label>
                {w.t(
                  "أهداف الخصم وقت التسجيل",
                  "Opponent score at observation",
                )}
                <input
                  type="number"
                  min="0"
                  max="32767"
                  value={scoreAgainst}
                  onChange={(e) => setScoreAgainst(e.target.value)}
                />
              </label>
              <label>
                {w.t("عدد لاعبينا", "Our court players")}
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={numericalFor}
                  onChange={(e) => setNumericalFor(Number(e.target.value))}
                />
              </label>
              <label>
                {w.t("عدد الخصم", "Opponent court players")}
                <input
                  type="number"
                  min="0"
                  max="7"
                  value={numericalAgainst}
                  onChange={(e) => setNumericalAgainst(Number(e.target.value))}
                />
              </label>
            </div>
            <label>
              {w.t("ملاحظة", "Note")}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button
              className="primary"
              disabled={a.busy || !sid || w.role === "viewer"}
            >
              {w.t("حفظ الحدث [T]", "Save event [T]")}
            </button>
          </form>
          <details>
            <summary>{w.t("تكتيكات الهجمة", "Possession tactics")}</summary>
            {w
              .list("tactical_terms")
              .filter((r) => !r.archived && r.category !== "shot_type")
              .map((r) => (
                <label className="term" key={r.id}>
                  <input
                    type="checkbox"
                    checked={terms.includes(r.id)}
                    onChange={(e) =>
                      setTerms((v) =>
                        e.target.checked
                          ? [...v, r.id]
                          : v.filter((id) => id !== r.id),
                      )
                    }
                  />
                  {s(w.lang === "ar" ? r.label_ar : r.label_en)}{" "}
                  <small>{s(r.category)}</small>
                </label>
              ))}
          </details>
          <div className="toolbar">
            <button
              disabled={!sid}
              onClick={() =>
                void a.run(async () => {
                  if (open) throw new Error("Close current possession");
                  const p = await w.save("possessions", {
                    ...base(),
                    sequence_no:
                      Math.max(0, ...possessions.map((p) => n(p.sequence_no))) +
                      1,
                    start_ms: Math.round(time),
                    phase,
                    score_for: scoreFor === "" ? null : Number(scoreFor),
                    score_against:
                      scoreAgainst === "" ? null : Number(scoreAgainst),
                    numerical_for: numericalFor,
                    numerical_against: numericalAgainst,
                  });
                  for (const id of terms)
                    await w.save("possession_tactics", {
                      possession_id: p.id,
                      term_id: id,
                    });
                })
              }
            >
              {w.t("بدء هجمة", "Start possession")}
            </button>
            <button
              disabled={!open}
              onClick={() =>
                void a.run(() =>
                  w.save("possessions", {
                    ...open,
                    end_ms: Math.round(time),
                    review_status: "reviewed",
                  }),
                )
              }
            >
              {w.t("إنهاء هجمة", "End possession")}
            </button>
          </div>
          <small>
            {w.t(
              "مسافة: تشغيل/إيقاف · الأسهم: ٥ ثوان · Ctrl+Z/Y",
              "Space: play/pause · arrows: 5s · Ctrl+Z/Y",
            )}
          </small>
        </Panel>
      </div>
      <nav className="tabs">
        {["events", "analytics", "lineups", "annotations", "review"].map(
          (v) => (
            <button
              className={tab === v ? "active" : ""}
              key={v}
              onClick={() => setTab(v)}
            >
              {w.t(
                {
                  events: "الأحداث",
                  analytics: "الإحصاءات",
                  lineups: "التشكيلات",
                  annotations: "الرسومات",
                  review: "المراجعة",
                }[v] ?? v,
                v,
              )}
            </button>
          ),
        )}
      </nav>
      {tab === "events" && (
        <Panel title={w.t("الأحداث والأدلة", "Events & evidence")}>
          <div className="toolbar">
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              {["all", ...new Set(events.map((e) => s(e.event_type)))].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
            <SelectRow
              label={w.t("لاعب", "Player")}
              rows={w.list("players")}
              value={participantFilter}
              onChange={setParticipantFilter}
            />
          </div>
          <div className="entity-list">
            {filtered.map((e) => (
              <article key={e.id}>
                <button onClick={() => edit(e)}>
                  {formatTime(n(e.timestamp_ms))} · {s(e.event_type)} ·{" "}
                  {rowLabel(
                    w.list("players").find((p) => p.id === e.actor_player_id) ??
                      e,
                  )}
                </button>
                <span>{s(e.note)}</span>
                <button onClick={() => void a.run(() => clip(e))}>
                  {w.t("مقطع دليل", "Evidence clip")}
                </button>
              </article>
            ))}
          </div>
          <EventParticipants events={events} matchId={matchId} />
        </Panel>
      )}
      {tab === "analytics" && (
        <Panel
          title={`${w.t("كفاءة التصويب", "Shot efficiency")} ${percent(summary.efficiency)} · n=${summary.sample}`}
        >
          <ShotMap
            shots={shots}
            onSelect={(sh) => {
              const e = events.find((e) => e.id === sh.event_id);
              if (e) edit(e);
            }}
          />
          <label>{w.t("موضع التصويب التالي", "Next shot location")}</label>
          <div
            className="goal-picker"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setGoalPoint({
                x: (e.clientX - r.left) / r.width,
                y: 1 - (e.clientY - r.top) / r.height,
              });
            }}
          >
            {w.t("اضغط موضع الكرة في المرمى", "Click shot placement in goal")}{" "}
            {goalPoint
              ? `${goalPoint.x.toFixed(2)}, ${goalPoint.y.toFixed(2)}`
              : ""}
          </div>
          <div
            className="location-picker"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setCourt({
                x: (e.clientX - r.left) / r.width,
                y: (e.clientY - r.top) / r.height,
              });
            }}
          >
            {court
              ? `${court.x.toFixed(2)}, ${court.y.toFixed(2)}`
              : w.t("اضغط لتحديد الإحداثيات", "Click to place coordinates")}
          </div>
          {keepers.map((k) => {
            const stats = keeperSummary(shots, k.id);
            return (
              <button
                key={k.id}
                onClick={() => {
                  setParticipantFilter("");
                  setFilter("shot");
                  setTab("events");
                }}
              >
                {rowLabel(k)} · {percent(stats.percentage)} · n={stats.sample}
              </button>
            );
          })}
        </Panel>
      )}
      {tab === "lineups" && (
        <Panel title={w.t("القائمة والتبديلات", "Roster & substitutions")}>
          <label>
            <input
              type="checkbox"
              checked={starting}
              onChange={(e) => setStarting(e.target.checked)}
            />
            {w.t("تشكيلة البداية", "Starting lineup")}
          </label>
          <div className="entity-list">
            {roster.map((r) => (
              <article key={r.id}>
                {rowLabel(
                  w.list("players").find((p) => p.id === r.player_id) ?? r,
                )}{" "}
                · {r.starting ? w.t("أساسي", "Starting") : w.t("بديل", "Bench")}
              </article>
            ))}
          </div>
          <div className="form-grid">
            <SelectRow
              label={w.t("لاعب", "Player")}
              rows={w.list("players")}
              value={inPlayer}
              onChange={setIn}
            />
            <SelectRow
              label={w.t("خروج", "Out")}
              rows={players}
              value={outPlayer}
              onChange={setOut}
            />
            <label>
              {w.t("المركز", "Position")}
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
              >
                {positions.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="toolbar">
            <button
              onClick={() =>
                void a.run(() =>
                  w.direct("match_roster", {
                    match_id: matchId,
                    player_id: inPlayer,
                    team_id: team,
                    side: team === match?.home_team_id ? "home" : "away",
                    starting,
                  }),
                )
              }
            >
              {w.t("إضافة للقائمة", "Add to roster")}
            </button>
            <button
              disabled={!clock}
              onClick={() =>
                void a.run(() =>
                  w.save("on_court_intervals", {
                    ...base(),
                    player_id: inPlayer,
                    position,
                    start_clock_ms: clock?.clockMs ?? 0,
                    verified: true,
                  }),
                )
              }
            >
              {w.t("فتح فترة لعب", "Open interval")}
            </button>
            <button
              disabled={!clock}
              onClick={() =>
                void a.run(() =>
                  w.substitute({
                    id: crypto.randomUUID(),
                    organization_id: w.org,
                    ...base(),
                    team_id: team,
                    out_player_id: outPlayer || null,
                    in_player_id: inPlayer || null,
                    position,
                    period: clock!.period,
                    clock_ms: clock!.clockMs,
                    video_ms: time,
                  } as Row),
                )
              }
            >
              {w.t("تبديل", "Substitute")}
            </button>
          </div>
          {intervals.map((r) => (
            <div className="interval" key={r.id}>
              {rowLabel(
                w.list("players").find((p) => p.id === r.player_id) ?? r,
              )}{" "}
              · {s(r.position)} · {n(r.period)} ·{" "}
              {formatTime(n(r.start_clock_ms))} →{" "}
              {r.end_clock_ms == null ? "…" : formatTime(n(r.end_clock_ms))}
              <button
                disabled={!clock}
                onClick={() =>
                  void a.run(() =>
                    w.save("on_court_intervals", {
                      ...r,
                      end_clock_ms: clock!.clockMs,
                      verified: true,
                    }),
                  )
                }
              >
                {w.t("إغلاق", "Close")}
              </button>
            </div>
          ))}
        </Panel>
      )}
      {tab === "annotations" && (
        <Panel title={w.t("رسومات الفيديو", "Video annotations")}>
          {w
            .list("video_annotations")
            .filter((r) => r.analysis_session_id === sid)
            .map((r) => (
              <div key={r.id} className="toolbar">
                <button onClick={() => seek(n(r.start_ms))}>
                  {formatTime(n(r.start_ms))} → {formatTime(n(r.end_ms))}
                </button>
                <button
                  onClick={() => {
                    seek(n(r.start_ms));
                    setAnnotationSnapshot(r);
                    setAnnotationStart(n(r.start_ms) / 1000);
                    setAnnotationEnd(n(r.end_ms) / 1000);
                    setAnnotationId(r.id);
                    setAnnotation(r.objects as unknown as Drawing[]);
                    setAnnotate(true);
                    player.current?.pause();
                  }}
                >
                  {w.t("تحرير", "Edit")}
                </button>
                <button
                  onClick={() =>
                    void a.run(() => w.save("video_annotations", r, true))
                  }
                >
                  {w.t("حذف", "Delete")}
                </button>
              </div>
            ))}
        </Panel>
      )}
      {tab === "review" && (
        <Panel title={w.t("مراجعة البيانات القديمة", "Legacy review")}>
          {w
            .list("legacy_shot_reviews")
            .filter((r) => !r.resolved && eventIds.has(s(r.event_id)))
            .map((r) => (
              <div key={r.id}>
                <button
                  onClick={() => {
                    const e = events.find((e) => e.id === r.event_id);
                    if (e) {
                      edit(e);
                      setEventType("shot");
                      setTab("events");
                    }
                  }}
                >
                  {s(r.reason)}
                </button>
                <button
                  onClick={() =>
                    void a.run(() =>
                      w.save("legacy_shot_reviews", { ...r, resolved: true }),
                    )
                  }
                >
                  {w.t("تمت المراجعة", "Reviewed")}
                </button>
              </div>
            ))}
        </Panel>
      )}
      <Link href="/playlists">
        {w.t("قوائم المقاطع والاجتماعات", "Clips, playlists & meetings")} →
      </Link>
    </div>
  );
}
