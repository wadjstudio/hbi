"use client";
import {
  ArrowRightLeft,
  Crosshair,
  Shield,
  Target,
  Undo2,
  Redo2,
  SlidersHorizontal,
} from "lucide-react";
import { useWorkspace } from "./provider";
export function QuickTagDock({
  available,
  busy,
  openPossession,
  undoAvailable,
  redoAvailable,
  onPossession,
  onShot,
  onTurnover,
  onEditor,
  onUndo,
  onRedo,
}: {
  available: boolean;
  busy: boolean;
  openPossession: boolean;
  undoAvailable: boolean;
  redoAvailable: boolean;
  onPossession: () => void;
  onShot: (result: string) => void;
  onTurnover: () => void;
  onEditor: () => void;
  onUndo: () => void;
  onRedo: () => void;
}) {
  const w = useWorkspace(),
    disabled = !available || busy;
  return (
    <section className="quick-tag-dock">
      <header>
        <b>{w.t("التسجيل السريع", "Quick tagging")}</b>
        <small>
          {w.t(
            "باستخدام الفريق والمشاركين المحددين",
            "Using the selected team and participants",
          )}
        </small>
        <button onClick={onEditor}>
          <SlidersHorizontal size={13} />
          {w.t("السياق والمشاركون", "Context & participants")}
        </button>
      </header>
      <div className="quick-tag-buttons">
        <button
          className="tag-attack"
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
          className="tag-shot"
          disabled={disabled}
          onClick={() => onShot("unknown")}
        >
          <Crosshair size={16} />
          {w.t("تصويبة للمراجعة", "Shot to review")}
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
          <Shield size={16} />
          {w.t("تصدٍ", "Save")}
        </button>
        <button
          className="tag-turnover"
          disabled={disabled}
          onClick={onTurnover}
        >
          <ArrowRightLeft size={16} />
          {w.t("فقد كرة", "Turnover")}
        </button>
        <button
          disabled={busy || !undoAvailable}
          onClick={onUndo}
          aria-label={w.t("تراجع سريع", "Quick undo")}
        >
          <Undo2 size={15} />
        </button>
        <button
          disabled={busy || !redoAvailable}
          onClick={onRedo}
          aria-label={w.t("إعادة سريعة", "Quick redo")}
        >
          <Redo2 size={15} />
        </button>
      </div>
      {!available && (
        <small>
          {w.t(
            "اربط الفيديو واختر الفريق لتفعيل التسجيل. تبقى المشاهدة متاحة للمستخدم القارئ.",
            "Link video and select a team to enable tagging. Viewers can still watch.",
          )}
        </small>
      )}
    </section>
  );
}
