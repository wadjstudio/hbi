"use client";
import { useEffect, useRef, useState } from "react";
import { useWorkspace } from "./provider";
import { Panel, Notice, useAction, rowLabel } from "./controls";
import { DrawingEditor } from "./drawing";
import { Entities } from "./entities";
import { s, n, type Drawing, type Row } from "@/types/workspace";
import { brand } from "@/lib/brand";
export function Tactics() {
  const w = useWorkspace();
  return (
    <Entities
      table="tactic_documents"
      title={w.t("مكتبة التكتيكات", "Tactical library")}
    />
  );
}
export function TacticBoard({
  id,
  editable = true,
}: {
  id: string;
  editable?: boolean;
}) {
  const w = useWorkspace(),
    a = useAction();
  const doc = w.list("tactic_documents").find((r) => r.id === id);
  const frames = w
    .list("tactic_frames")
    .filter((r) => r.document_id === id)
    .sort((a, b) => n(a.position) - n(b.position));
  const [frameId, setFrame] = useState(""),
    [objects, setObjects] = useState<Drawing[]>([]),
    [duration, setDuration] = useState(1000),
    [playing, setPlaying] = useState(false);
  const raf = useRef(0);
  const autosave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshot = useRef<{ fid: string; identities: Row[]; states: Row[] }>({
    fid: "",
    identities: [],
    states: [],
  });
  const frame = frames.find((r) => r.id === frameId) ?? frames[0],
    actual = frame?.id ?? "";
  function frameObjects(fid: string): Drawing[] {
    return w
      .list("tactic_frame_objects")
      .filter((r) => r.frame_id === fid && r.visible !== false)
      .map((r) => {
        const o = w.list("tactic_objects").find((o) => o.id === r.object_id);
        return {
          id: s(r.object_id),
          kind: (o?.kind ?? "player") as Drawing["kind"],
          label: s(o?.label),
          color: s(o?.color) || brand.colors.cyan,
          x: n(r.x),
          y: n(r.y),
          ...(r.geometry as object),
        };
      });
  }
  useEffect(() => {
    if (autosave.current) clearTimeout(autosave.current);
    snapshot.current = {
      fid: actual,
      identities: w.list("tactic_objects").filter((r) => r.document_id === id),
      states: w
        .list("tactic_frame_objects")
        .filter((r) => r.frame_id === actual),
    };
    queueMicrotask(() => setObjects(frameObjects(actual)));
    // The selected frame is the editing snapshot; other workspace updates must not erase edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actual]);
  useEffect(
    () => () => {
      cancelAnimationFrame(raf.current);
      if (autosave.current) clearTimeout(autosave.current);
    },
    [],
  );
  async function persist(fid: string, drawings: Drawing[]) {
    const identities = snapshot.current.identities,
      states = fid === snapshot.current.fid ? snapshot.current.states : [];
    const savedStates: Row[] = [],
      savedIdentities: Row[] = [];
    for (const o of drawings) {
      const identity = identities.find((r) => r.id === o.id);
      if (
        !identity ||
        identity.label !== o.label ||
        identity.color !== o.color
      ) {
        savedIdentities.push(
          await w.save("tactic_objects", {
            ...identity,
            id: o.id,
            document_id: id,
            kind: o.kind,
            label: o.label,
            color: o.color,
          }),
        );
      } else savedIdentities.push(identity);
      savedStates.push(
        await w.save("tactic_frame_objects", {
          ...states.find((r) => r.object_id === o.id),
          frame_id: fid,
          object_id: o.id,
          x: o.x,
          y: o.y,
          geometry: { x2: o.x2 ?? o.x, y2: o.y2 ?? o.y },
          visible: true,
        }),
      );
    }
    for (const r of states)
      if (!drawings.some((o) => o.id === r.object_id))
        await w.save("tactic_frame_objects", r, true);
    snapshot.current = {
      fid,
      identities: savedIdentities,
      states: savedStates,
    };
  }
  async function addFrame() {
    const created = await w.save("tactic_frames", {
      document_id: id,
      position: Math.max(-1, ...frames.map((r) => n(r.position))) + 1,
      title: `Frame ${frames.length + 1}`,
    });
    await persist(created.id, objects);
    setFrame(created.id);
  }
  function play() {
    if (!frame) return;
    const next = frames.find((f) => n(f.position) > n(frame.position));
    if (!next) return;
    const from = frameObjects(actual),
      to = frameObjects(next.id),
      animation = w
        .list("tactic_animations")
        .find((r) => r.from_frame_id === actual && r.to_frame_id === next.id),
      ms = n(animation?.duration_ms) || duration;
    let start: number | null = null;
    setPlaying(true);
    const tick = (now: number) => {
      start ??= now;
      let fraction = Math.min(1, (now - start) / ms);
      if (animation?.easing === "ease_in_out")
        fraction = fraction * fraction * (3 - 2 * fraction);
      setObjects(
        from.map((o) => {
          const dest = to.find((d) => d.id === o.id);
          return dest
            ? {
                ...o,
                x: o.x + (dest.x - o.x) * fraction,
                y: o.y + (dest.y - o.y) * fraction,
                x2:
                  (o.x2 ?? o.x) +
                  ((dest.x2 ?? dest.x) - (o.x2 ?? o.x)) * fraction,
                y2:
                  (o.y2 ?? o.y) +
                  ((dest.y2 ?? dest.y) - (o.y2 ?? o.y)) * fraction,
              }
            : o;
        }),
      );
      if (now - start < ms) raf.current = requestAnimationFrame(tick);
      else {
        setFrame(next.id);
        setObjects(to);
        setPlaying(false);
      }
    };
    raf.current = requestAnimationFrame(tick);
  }
  if (!doc)
    return <Notice>{w.t("التكتيك غير موجود", "Tactic not found")}</Notice>;
  return (
    <Panel title={rowLabel(doc)}>
      <div className="toolbar">
        {frames.map((f) => (
          <button
            className={f.id === actual ? "active" : ""}
            key={f.id}
            onClick={() => setFrame(f.id)}
          >
            {rowLabel(f)}
          </button>
        ))}
        {editable && (
          <button onClick={() => void a.run(addFrame)}>
            {w.t("إطار جديد / نسخ الحالي", "New frame / copy current")}
          </button>
        )}
        <button disabled={playing} onClick={play}>
          {w.t("تشغيل الحركة", "Play animation")}
        </button>
      </div>
      {a.error && <Notice>{a.error}</Notice>}
      <DrawingEditor
        objects={objects}
        onChange={(drawings) => {
          setObjects(drawings);
          if (autosave.current) clearTimeout(autosave.current);
          if (actual)
            autosave.current = setTimeout(
              () => void a.run(() => persist(actual, drawings)),
              800,
            );
        }}
        editable={editable && w.role !== "viewer" && !playing}
      />
      {editable && (
        <div className="toolbar">
          <button
            disabled={!actual}
            className="primary"
            onClick={() =>
              void a.run(async () => {
                if (autosave.current) clearTimeout(autosave.current);
                await persist(actual, objects);
              })
            }
          >
            {w.t("حفظ الإطار", "Save frame")}
          </button>
          <label>
            {w.t("زمن الحركة / مللي ثانية", "Animation duration / ms")}
            <input
              type="number"
              min="100"
              max="30000"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
          </label>
          <button
            disabled={!actual}
            onClick={() =>
              void a.run(async () => {
                const next = frames.find(
                  (f) => n(f.position) > n(frame?.position),
                );
                if (!next) throw new Error("Add next frame first");
                await w.save("tactic_animations", {
                  ...w
                    .list("tactic_animations")
                    .find(
                      (r) =>
                        r.from_frame_id === actual && r.to_frame_id === next.id,
                    ),
                  from_frame_id: actual,
                  to_frame_id: next.id,
                  duration_ms: duration,
                  easing: "ease_in_out",
                });
              })
            }
          >
            {w.t("حفظ الحركة", "Save animation")}
          </button>
        </div>
      )}
    </Panel>
  );
}
