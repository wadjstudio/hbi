"use client";
import { useState } from "react";
import { useWorkspace } from "./provider";
import { Panel, Notice, useAction } from "./controls";
import { s, type Value } from "@/types/workspace";
type Button = {
  label: string;
  event_type: string;
  key: string;
  pre_seconds: number;
  post_seconds: number;
};
export function TagTemplates() {
  const w = useWorkspace(),
    a = useAction();
  const [title, setTitle] = useState(""),
    [buttons, setButtons] = useState<Button[]>([]),
    [label, setLabel] = useState(""),
    [event, setEvent] = useState("shot"),
    [key, setKey] = useState(""),
    [pre, setPre] = useState(8),
    [post, setPost] = useState(4);
  return (
    <Panel title={w.t("قوالب التسجيل", "Tagging templates")}>
      <form
        className="editor"
        onSubmit={(e) => {
          e.preventDefault();
          void a.run(async () => {
            if (!buttons.length) throw new Error("Add at least one button");
            if (
              new Set(buttons.filter((b) => b.key).map((b) => b.key)).size !==
              buttons.filter((b) => b.key).length
            )
              throw new Error("Shortcut keys must be unique");
            await w.save("tagging_templates", {
              title,
              buttons: buttons as unknown as Value,
            });
            setTitle("");
            setButtons([]);
          });
        }}
      >
        <label>
          {w.t("عنوان القالب", "Template title")}
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <div className="form-grid">
          <label>
            {w.t("اسم الزر", "Button label")}
            <input value={label} onChange={(e) => setLabel(e.target.value)} />
          </label>
          <label>
            {w.t("الحدث", "Event")}
            <select value={event} onChange={(e) => setEvent(e.target.value)}>
              {[
                "shot",
                "assist",
                "turnover",
                "steal",
                "block",
                "duel",
                "seven_meter_won",
                "two_minute_penalty",
                "timeout",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            {w.t("مفتاح اختصار", "Shortcut")}
            <input
              maxLength={1}
              value={key}
              onChange={(e) => setKey(e.target.value.toLowerCase())}
            />
          </label>
          <label>
            {w.t("قبل الحدث / ثانية", "Pre-roll / seconds")}
            <input
              type="number"
              min={0}
              max={60}
              value={pre}
              onChange={(e) => setPre(Number(e.target.value))}
            />
          </label>
          <label>
            {w.t("بعد الحدث / ثانية", "Post-roll / seconds")}
            <input
              type="number"
              min={1}
              max={60}
              value={post}
              onChange={(e) => setPost(Number(e.target.value))}
            />
          </label>
        </div>
        <button
          type="button"
          disabled={!label}
          onClick={() => {
            setButtons((b) => [
              ...b,
              {
                label,
                event_type: event,
                key,
                pre_seconds: pre,
                post_seconds: post,
              },
            ]);
            setLabel("");
            setKey("");
          }}
        >
          {w.t("إضافة زر", "Add button")}
        </button>
        <div className="toolbar">
          {buttons.map((b, i) => (
            <button
              type="button"
              key={i}
              onClick={() =>
                setButtons((rows) => rows.filter((_, j) => i !== j))
              }
            >
              {b.label} [{b.key}] ×
            </button>
          ))}
        </div>
        <button disabled={w.role === "viewer"}>
          {w.t("حفظ القالب", "Save template")}
        </button>
      </form>
      {a.error && <Notice>{a.error}</Notice>}
      {w.list("tagging_templates").map((r) => (
        <div className="toolbar" key={r.id}>
          <b>{s(r.title)}</b>
          <button
            onClick={() => {
              setTitle(s(r.title));
              setButtons(r.buttons as unknown as Button[]);
            }}
          >
            {w.t("نسخ للتحرير", "Copy to edit")}
          </button>
          <button
            onClick={() =>
              void a.run(() => w.save("tagging_templates", r, true))
            }
          >
            ×
          </button>
        </div>
      ))}
    </Panel>
  );
}
