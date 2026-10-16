"use client";
import type { ComponentProps, ReactNode } from "react";
import {
  ArrowRightLeft,
  Crosshair,
  Shield,
  Target,
  Undo2,
  Redo2,
  SlidersHorizontal,
  Swords,
  Route,
  Timer,
  CircleDot,
  Hand,
} from "lucide-react";
import { useWorkspace } from "./provider";
export type QuickEvent = "turnover" | "seven_meter_won" | "two_minute_penalty";
type QuickTagDockProps = ComponentProps<"section"> & {
  available: boolean;
  busy: boolean;
  openPossession: boolean;
  undoAvailable: boolean;
  redoAvailable: boolean;
  context: ReactNode;
  phase: string;
  onPhase: (phase: string) => void;
  onPossession: () => void;
  onShot: (result: "unknown" | "goal" | "save") => void;
  onEvent: (event: QuickEvent) => void;
  onEditor: () => void;
  onUndo: () => void;
  onRedo: () => void;
};
export const QuickTagDock = ({
  available,
  busy,
  openPossession,
  undoAvailable,
  redoAvailable,
  onPossession,
  onShot,
  onEvent,
  context,
  phase,
  onPhase,
  className,
  onEditor,
  onUndo,
  onRedo,
  ...props
}: QuickTagDockProps) => {
  const w = useWorkspace(),
    disabled = !available || busy;
  const transition = [
    "fast_break",
    "second_wave",
    "transition_defense",
  ].includes(phase)
    ? phase
    : "";
  return (
    <section
      {...props}
      className={`quick-tag-dock ${className ?? ""}`}
      data-slot="quick-tag-dock"
      aria-label={w.t("التسجيل السريع", "Quick tagging")}
    >
      <header className="quick-tag-context">
        {context}
        <div className="quick-tag-actions">
          <button
            className="dock-possession"
            disabled={disabled}
            onClick={onPossession}
          >
            <ArrowRightLeft size={16} />
            {w.t(
              openPossession ? "إنهاء الهجمة" : "بدء الهجمة",
              openPossession ? "Finish possession" : "Begin possession",
            )}
          </button>
          <button
            disabled={busy || !undoAvailable}
            onClick={onUndo}
            aria-label={w.t("تراجع سريع", "Quick undo")}
          >
            <Undo2 size={14} />
          </button>
          <button
            disabled={busy || !redoAvailable}
            onClick={onRedo}
            aria-label={w.t("إعادة سريعة", "Quick redo")}
          >
            <Redo2 size={14} />
          </button>
          <button
            onClick={onEditor}
            aria-label={w.t("السياق والمشاركون", "Context & participants")}
            title={w.t("السياق والمشاركون", "Context & participants")}
          >
            <SlidersHorizontal size={14} />
          </button>
        </div>
      </header>
      <div className="quick-tag-row">
        <b>{w.t("تسجيل سريع", "Quick tag")}</b>
        <div className="quick-tag-buttons">
          <button
            className="tag-attack"
            disabled={disabled}
            aria-pressed={phase === "positional_attack"}
            title={w.t(
              "اختيار هجوم منظم للأحداث التالية",
              "Set positional attack for subsequent events",
            )}
            onClick={() => onPhase("positional_attack")}
          >
            <Swords size={15} />
            {w.t("هجوم", "Attack")}
          </button>
          <button
            className="tag-defense"
            disabled={disabled}
            aria-pressed={phase === "set_defense"}
            title={w.t(
              "اختيار دفاع منظم للأحداث التالية",
              "Set organized defense for subsequent events",
            )}
            onClick={() => onPhase("set_defense")}
          >
            <Shield size={15} />
            {w.t("دفاع", "Defense")}
          </button>
          <label
            className="tag-transition"
            title={w.t(
              "اختيار نوع التحول للأحداث التالية",
              "Choose transition context for subsequent events",
            )}
          >
            <Route size={15} aria-hidden="true" />
            <select
              aria-label={w.t("سياق التحول", "Transition context")}
              disabled={disabled}
              value={transition}
              onChange={(e) => onPhase(e.target.value)}
            >
              <option value="" disabled>
                {w.t("تحول", "Transition")}
              </option>
              <option value="fast_break">
                {w.t("هجوم سريع", "Fast break")}
              </option>
              <option value="second_wave">
                {w.t("موجة ثانية", "Second wave")}
              </option>
              <option value="transition_defense">
                {w.t("عودة دفاعية", "Defensive return")}
              </option>
            </select>
          </label>
          <button
            className="tag-shot"
            disabled={disabled}
            onClick={() => onShot("unknown")}
            aria-label={w.t("تصويبة للمراجعة", "Shot to review")}
          >
            <Crosshair size={16} />
            {w.t("تصويبة", "Shot")}
          </button>
          <button
            className="tag-goal"
            disabled={disabled}
            onClick={() => onShot("goal")}
          >
            <Target size={16} />
            {w.t("هدف", "Goal")}
          </button>
          <button
            className="tag-save"
            disabled={disabled}
            onClick={() => onShot("save")}
          >
            <Hand size={16} />
            {w.t("تصدٍ", "Save")}
          </button>
          <button
            className="tag-turnover"
            disabled={disabled}
            onClick={() => onEvent("turnover")}
          >
            <ArrowRightLeft size={16} />
            {w.t("فقد كرة", "Turnover")}
          </button>
          <button
            className="tag-seven-meter"
            disabled={disabled}
            onClick={() => onEvent("seven_meter_won")}
            title={w.t(
              "حصول الفريق المحدد على 7م، وليست محاولة تصويب",
              "7m awarded to the selected team, not a shot attempt",
            )}
          >
            <CircleDot size={15} />
            {w.t("حصول 7م", "7m won")}
          </button>
          <button
            className="tag-penalty"
            disabled={disabled}
            onClick={() => onEvent("two_minute_penalty")}
            title={w.t(
              "إيقاف للاعب أو الفريق المحدد؛ عدّل السياق العددي عند الحاجة",
              "Suspension against the selected player/team; adjust numerical context if needed",
            )}
          >
            <Timer size={15} />
            {w.t("دقيقتان", "2 min")}
          </button>
        </div>
      </div>
      {!available && (
        <small>
          {w.t(
            "التسجيل يحتاج مصدرًا وفريقًا وصلاحية كتابة، مع إنهاء تحرير الحدث الحالي.",
            "Tagging requires a linked source, team and write access; finish any current event edit.",
          )}
        </small>
      )}
    </section>
  );
};
