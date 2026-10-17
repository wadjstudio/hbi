"use client";
import { useId, useRef } from "react";
import {
  ArrowRightLeft,
  Check,
  CircleDashed,
  CornerUpRight,
  GitFork,
  Hand,
  Lightbulb,
  MoveUpRight,
  Play,
  Route,
  Shuffle,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useWorkspace } from "./provider";

export type IntelligenceListEntry = {
  id: string;
  title: string;
  detail: string;
  body?: string;
  code?: string;
  isReviewed?: boolean;
  isEvidenceAvailable: boolean;
  onEvidence: () => void;
};

const procedureIcons: Record<string, typeof Shuffle> = {
  cross: Shuffle,
  double_cross: Shuffle,
  screen: Hand,
  pivot_cooperation: Users,
  wing_entry: CornerUpRight,
  position_exchange: ArrowRightLeft,
  isolation: UserRound,
  breakthrough: MoveUpRight,
  overload: GitFork,
};
const TacticalGlyph = ({ code }: { code?: string }) => {
  const Icon =
    code && Object.hasOwn(procedureIcons, code) ? procedureIcons[code]! : Route;
  return <Icon size={23} aria-hidden="true" />;
};

export const IntelligenceListCard = ({
  title,
  entries,
  isInsights = false,
  emptyText,
}: {
  title: string;
  entries: IntelligenceListEntry[];
  isInsights?: boolean;
  emptyText: string;
}) => {
  const w = useWorkspace();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const allTitle = `${title} · ${w.t("كل العناصر", "All items")} (${entries.length})`;
  const row = (entry: IntelligenceListEntry, isFull = false) => (
    <div
      key={entry.id}
      className="intelligence-list-item"
      data-review={
        isInsights ? (entry.isReviewed ? "reviewed" : "pending") : undefined
      }
    >
      <button
        className="intelligence-evidence-action"
        disabled={!entry.isEvidenceAvailable}
        aria-label={`${entry.title} · ${entry.detail} · ${w.t("مشاهدة الأدلة", "Watch evidence")}`}
        onClick={() => {
          if (isFull) dialogRef.current?.close();
          entry.onEvidence();
        }}
      >
        <span className="intelligence-procedure-icon" aria-hidden="true">
          {isInsights ? (
            entry.isReviewed ? (
              <Check size={16} />
            ) : (
              <CircleDashed size={16} />
            )
          ) : (
            <TacticalGlyph code={entry.code} />
          )}
        </span>
        <span className="intelligence-list-copy">
          <b title={entry.title}>{entry.title}</b>
          <small>{entry.detail}</small>
        </span>
        <span className="intelligence-watch" aria-hidden="true">
          <Play size={13} />
          {isInsights && <span>{w.t("شاهد الدليل", "Watch evidence")}</span>}
        </span>
      </button>
      {isFull && entry.body && (
        <p className="intelligence-list-body">{entry.body}</p>
      )}
    </div>
  );
  return (
    <section
      className={`intelligence-section intelligence-list-card ${isInsights ? "insight-section" : "tactical-pattern-section"}`}
      data-slot="intelligence-list-card"
      aria-label={title}
    >
      <header>
        {isInsights && <Lightbulb size={14} aria-hidden="true" />}
        <h3>{title}</h3>
        {entries.length > 0 && (
          <button
            className="intelligence-list-more"
            aria-label={`${w.t("عرض الكل", "View all")} · ${title} · ${entries.length}`}
            onClick={() => dialogRef.current?.showModal()}
          >
            {w.t("عرض الكل", "View all")}{" "}
            <span dir="ltr">({entries.length})</span>
          </button>
        )}
      </header>
      {entries.length ? (
        <div className="intelligence-list-preview">
          {entries.slice(0, isInsights ? 4 : 2).map((entry) => row(entry))}
        </div>
      ) : (
        <p className="intelligence-empty">{emptyText}</p>
      )}
      <dialog
        ref={dialogRef}
        className="intelligence-list-dialog"
        aria-labelledby={headingId}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key !== "Tab") return;
          const nodes = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              "button:not(:disabled),[tabindex='0']",
            ),
          ).filter((node) => node.getClientRects().length > 0);
          const first = nodes[0],
            last = nodes.at(-1);
          if (
            first &&
            last &&
            (event.shiftKey
              ? document.activeElement === first ||
                document.activeElement === event.currentTarget
              : document.activeElement === last)
          ) {
            event.preventDefault();
            (event.shiftKey ? last : first).focus();
          }
        }}
      >
        <header>
          <div>
            <span className="hbi-kicker">SESEN INTELLIGENCE</span>
            <h2 id={headingId}>{allTitle}</h2>
          </div>
          <button
            aria-label={w.t("إغلاق القائمة", "Close intelligence list")}
            onClick={() => dialogRef.current?.close()}
          >
            <X size={18} />
          </button>
        </header>
        <p className="intelligence-list-scope">
          {w.t(
            "العينة والفلاتر الحالية فقط. افتح الأدلة لمراجعة الأحداث ومصادرها.",
            "Current sample and filters only. Open evidence to review events and their sources.",
          )}
        </p>
        <div
          className="intelligence-list-complete"
          role="region"
          tabIndex={0}
          aria-label={allTitle}
        >
          {entries.map((entry) => row(entry, true))}
        </div>
      </dialog>
    </section>
  );
};
