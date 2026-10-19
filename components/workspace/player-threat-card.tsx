"use client";
import { useId, useRef } from "react";
import { X } from "lucide-react";
import type { shotSummary } from "@/lib/analytics/metrics";
import { useWorkspace } from "./provider";
import { PlayerThreatRow } from "./player-threat-row";

export type PlayerThreatEntry = {
  id: string;
  name: string;
  number: string;
  photoUrl?: string | null;
  summary: ReturnType<typeof shotSummary>;
  onAll: () => void;
  onReviewed: () => void;
};
export const PlayerThreatCard = ({
  title,
  entries,
  isSummary = false,
}: {
  title: string;
  entries: PlayerThreatEntry[];
  isSummary?: boolean;
}) => {
  const w = useWorkspace();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const allTitle = `${title} · ${w.t("كل اللاعبين", "All players")} (${entries.length})`;
  const row = (entry: PlayerThreatEntry, isFull = false) => (
    <PlayerThreatRow
      key={entry.id}
      {...entry}
      onAll={() => {
        if (isFull) dialogRef.current?.close();
        entry.onAll();
      }}
      onReviewed={() => {
        if (isFull) dialogRef.current?.close();
        entry.onReviewed();
      }}
    />
  );
  return (
    <section
      className={`${isSummary ? "dashboard-card" : "intelligence-section player-threat-section"} player-threat-card`}
      data-slot="player-threat-card"
      aria-label={title}
    >
      <header>
        <h3>{title}</h3>
        {entries.length > 0 && (
          <button
            type="button"
            className="player-threat-more"
            aria-label={`${w.t("عرض كل اللاعبين", "View all players")} · ${title} · ${entries.length}`}
            onClick={() => dialogRef.current?.showModal()}
          >
            {w.t("عرض الكل", "View all")}{" "}
            <span dir="ltr">({entries.length})</span>
          </button>
        )}
      </header>
      {entries.length ? (
        <div className="player-threat-preview">
          {entries.slice(0, isSummary ? 4 : 3).map((entry) => row(entry))}
        </div>
      ) : (
        <p className="intelligence-empty">
          {w.t(
            "اربط المصوّب بالمحاولة لعرض ملفه وأدلته.",
            "Link shooters to attempts to reveal their profiles and evidence.",
          )}
        </p>
      )}
      <dialog
        ref={dialogRef}
        className="intelligence-list-dialog player-threat-dialog"
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
          <h2 id={headingId}>{allTitle}</h2>
          <button
            type="button"
            aria-label={w.t("إغلاق قائمة اللاعبين", "Close player list")}
            onClick={() => dialogRef.current?.close()}
          >
            <X size={18} />
          </button>
        </header>
        <p className="intelligence-list-scope">
          {w.t(
            "العينة والفلاتر الحالية فقط. الاسم يفتح كل المحاولات، والنسبة تفتح المحاولات المراجعة فقط. الهوية والمركز غير المحددين لا يُستنتجان.",
            "Current sample and filters only. Names open all attempts; rates open reviewed attempts only. Missing identities and positions are not inferred.",
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
