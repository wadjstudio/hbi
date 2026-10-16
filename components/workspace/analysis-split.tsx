"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Group, Panel, Separator, useGroupRef } from "react-resizable-panels";
import {
  Columns2,
  Maximize2,
  RotateCcw,
  GripVertical,
  Scan,
  SlidersHorizontal,
} from "lucide-react";
import { useWorkspace } from "./provider";

export const AnalysisSplit = ({
  video,
  intelligence,
  controls,
}: {
  video: (layoutControls: ReactNode) => ReactNode;
  intelligence: ReactNode;
  controls?: ReactNode;
}) => {
  const w = useWorkspace(),
    group = useGroupRef();
  const [focus, setFocus] = useState(false);
  const [isFit, setIsFit] = useState(true);
  const menu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !menu.current?.contains(event.target) &&
        menu.current
      )
        menu.current.open = false;
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  const layoutControls = (
    <details
      ref={menu}
      className="layout-menu"
      data-slot="layout-menu"
      onKeyDown={(event) => {
        if (event.key === "Escape" && menu.current?.open) {
          event.preventDefault();
          if (menu.current) {
            menu.current.open = false;
            menu.current.querySelector("summary")?.focus();
          }
        }
      }}
    >
      <summary aria-label={w.t("العرض والجلسات", "Layout & sessions")}>
        <SlidersHorizontal size={13} aria-hidden="true" />
        {w.t("العرض والجلسات", "Layout & sessions")}
      </summary>
      <div className="layout-controls">
        {controls ?? (
          <small>{w.t("مساحة التحليل", "Analysis workspace")}</small>
        )}
        <button aria-pressed={focus} onClick={() => setFocus(!focus)}>
          {focus ? <Columns2 size={13} /> : <Maximize2 size={13} />}
          {w.t(
            focus ? "الفيديو والأدلة" : "تركيز الفيديو",
            focus ? "Video & evidence" : "Focus video",
          )}
        </button>
        <button
          className="video-fit-control"
          aria-pressed={isFit}
          disabled={focus}
          onClick={() => setIsFit(!isFit)}
        >
          <Scan size={13} aria-hidden="true" />
          {w.t("ملاءمة مساحة العمل", "Fit workspace")}
        </button>
        <button
          onClick={() => {
            setFocus(false);
            group.current?.setLayout({ video: 58, intelligence: 42 });
          }}
        >
          <RotateCcw size={12} />
          {w.t("إعادة التقسيم", "Reset layout")}
        </button>
      </div>
    </details>
  );
  return (
    <section
      className={`analysis-split${focus ? " video-focus" : ""}`}
      data-fit={isFit ? "viewport" : "natural"}
      data-slot="analysis-split"
    >
      <Group
        className="analysis-panels"
        groupRef={group}
        orientation="horizontal"
        defaultLayout={{ video: 58, intelligence: 42 }}
        disabled={focus}
        style={{ overflow: "visible" }}
      >
        <Panel
          id="video"
          minSize="40%"
          className="analysis-video-panel"
          style={{ overflow: "visible" }}
        >
          {video(layoutControls)}
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
};
