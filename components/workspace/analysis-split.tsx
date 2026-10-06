"use client";
import { useState, type ReactNode } from "react";
import { Group, Panel, Separator, useGroupRef } from "react-resizable-panels";
import { Columns2, Maximize2, RotateCcw, GripVertical } from "lucide-react";
import { useWorkspace } from "./provider";

export function AnalysisSplit({
  video,
  intelligence,
}: {
  video: ReactNode;
  intelligence: ReactNode;
}) {
  const w = useWorkspace(),
    group = useGroupRef();
  const [focus, setFocus] = useState(false);
  return (
    <section className={`analysis-split${focus ? " video-focus" : ""}`}>
      <div className="layout-controls">
        <small>{w.t("مساحة التحليل", "Analysis workspace")}</small>
        <button aria-pressed={focus} onClick={() => setFocus(!focus)}>
          {focus ? <Columns2 size={13} /> : <Maximize2 size={13} />}
          {w.t(
            focus ? "الفيديو والأدلة" : "تركيز الفيديو",
            focus ? "Video & evidence" : "Focus video",
          )}
        </button>
        <button
          onClick={() => {
            setFocus(false);
            group.current?.setLayout({ video: 64, intelligence: 36 });
          }}
        >
          <RotateCcw size={12} />
          {w.t("إعادة التقسيم", "Reset layout")}
        </button>
      </div>
      <Group
        className="analysis-panels"
        groupRef={group}
        orientation="horizontal"
        defaultLayout={{ video: 64, intelligence: 36 }}
        disabled={focus}
        style={{ overflow: "visible" }}
      >
        <Panel
          id="video"
          minSize="40%"
          className="analysis-video-panel"
          style={{ overflow: "visible" }}
        >
          {video}
        </Panel>
        <Separator
          className="analysis-separator"
          aria-label={w.t(
            "تغيير عرض الفيديو والأدلة",
            "Resize video and evidence",
          )}
        >
          <GripVertical size={13} />
        </Separator>
        <Panel
          id="intelligence"
          minSize="28%"
          className="analysis-intelligence-panel"
          style={{ overflow: "visible" }}
        >
          {intelligence}
        </Panel>
      </Group>
    </section>
  );
}
