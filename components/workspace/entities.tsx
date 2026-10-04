"use client";
import Link from "next/link";
import { useState } from "react";
import { canWrite } from "@/lib/permissions/roles";
import { useWorkspace } from "./provider";
import {
  EntityEditor,
  Panel,
  Notice,
  useAction,
  rowLabel,
  type Field,
} from "./controls";
import { s, positions, type Row, type Table } from "@/types/workspace";
export const entityFields: Partial<Record<Table, Field[]>> = {
  team_players: [
    {
      key: "team_id",
      ar: "الفريق",
      en: "Team",
      table: "teams",
      required: true,
    },
    {
      key: "player_id",
      ar: "اللاعب",
      en: "Player",
      table: "players",
      required: true,
    },
    { key: "season_id", ar: "الموسم", en: "Season", table: "seasons" },
    {
      key: "shirt_number",
      ar: "رقم القميص",
      en: "Shirt number",
      type: "number",
    },
    { key: "starts_on", ar: "البداية", en: "Start", type: "date" },
    { key: "ends_on", ar: "النهاية", en: "End", type: "date" },
  ],
  teams: [
    { key: "name", ar: "اسم الفريق", en: "Team name", required: true },
    { key: "short_name", ar: "اختصار", en: "Short name" },
    { key: "is_own_team", ar: "فريقنا", en: "Our team", type: "checkbox" },
  ],
  seasons: [
    { key: "name", ar: "الموسم", en: "Season", required: true },
    { key: "starts_on", ar: "البداية", en: "Start", type: "date" },
    { key: "ends_on", ar: "النهاية", en: "End", type: "date" },
  ],
  competitions: [
    { key: "name", ar: "البطولة", en: "Competition", required: true },
    { key: "season_id", ar: "الموسم", en: "Season", table: "seasons" },
  ],
  players: [
    { key: "first_name", ar: "الاسم الأول", en: "First name", required: true },
    { key: "last_name", ar: "الاسم الأخير", en: "Last name", required: true },
    {
      key: "primary_position",
      ar: "المركز",
      en: "Position",
      options: [...positions],
    },
    { key: "shirt_number", ar: "الرقم", en: "Number", type: "number" },
    {
      key: "dominant_hand",
      ar: "اليد",
      en: "Hand",
      options: ["left", "right", "both", "unknown"],
    },
  ],
  matches: [
    {
      key: "home_team_id",
      ar: "صاحب الأرض",
      en: "Home team",
      table: "teams",
      required: true,
    },
    {
      key: "away_team_id",
      ar: "الضيف",
      en: "Away team",
      table: "teams",
      required: true,
    },
    { key: "season_id", ar: "الموسم", en: "Season", table: "seasons" },
    {
      key: "competition_id",
      ar: "البطولة",
      en: "Competition",
      table: "competitions",
    },
    { key: "starts_at", ar: "الموعد", en: "Date", type: "datetime-local" },
    { key: "venue", ar: "الملعب", en: "Venue" },
    {
      key: "home_score",
      ar: "أهداف صاحب الأرض",
      en: "Home score",
      type: "number",
    },
    { key: "away_score", ar: "أهداف الضيف", en: "Away score", type: "number" },
    {
      key: "status",
      ar: "الحالة",
      en: "Status",
      options: ["scheduled", "ready", "in_analysis", "analysed", "archived"],
    },
  ],
  playlists: [
    { key: "title", ar: "عنوان القائمة", en: "Playlist title", required: true },
    { key: "description", ar: "الوصف", en: "Description", type: "textarea" },
  ],
  presentations: [
    { key: "title", ar: "عنوان الاجتماع", en: "Meeting title", required: true },
  ],
  tactic_documents: [
    { key: "title", ar: "اسم التكتيك", en: "Tactic title", required: true },
    { key: "description", ar: "الوصف", en: "Description", type: "textarea" },
    { key: "team_id", ar: "الفريق", en: "Team", table: "teams" },
  ],
  reports: [
    { key: "title", ar: "عنوان التقرير", en: "Report title", required: true },
    {
      key: "report_type",
      ar: "النوع",
      en: "Type",
      options: ["match", "opponent", "player", "team"],
      required: true,
    },
    { key: "team_id", ar: "الفريق", en: "Team", table: "teams" },
    { key: "match_id", ar: "المباراة", en: "Match", table: "matches" },
    { key: "player_id", ar: "اللاعب", en: "Player", table: "players" },
  ],
};
export function matchLabel(row: Row, teams: Row[]) {
  return `${rowLabel(teams.find((t) => t.id === row.home_team_id) ?? { ...row, name: "?" })} — ${rowLabel(teams.find((t) => t.id === row.away_team_id) ?? { ...row, name: "?" })}`;
}
export function Entities({ table, title }: { table: Table; title: string }) {
  const w = useWorkspace(),
    a = useAction();
  const [editing, setEditing] = useState<Row | null | undefined>(undefined);
  const fields = entityFields[table] ?? [];
  const link = (r: Row) =>
    table === "matches"
      ? `/matches/${r.id}`
      : table === "players"
        ? `/players/${r.id}`
        : table === "tactic_documents"
          ? `/tactics/${r.id}`
          : table === "presentations"
            ? `/meetings/${r.id}`
            : table === "playlists"
              ? `/playlists/${r.id}`
              : table === "reports"
                ? `/reports/${r.id}`
                : "";
  return (
    <Panel
      title={title}
      actions={
        <button
          disabled={!canWrite(w.role, table)}
          onClick={() => setEditing(null)}
        >
          {w.t("إضافة", "Add")}
        </button>
      }
    >
      {editing !== undefined && (
        <EntityEditor
          key={editing?.id ?? "new"}
          table={table}
          fields={fields}
          row={editing ?? undefined}
          onDone={() => setEditing(undefined)}
        />
      )}
      {a.error && <Notice>{a.error}</Notice>}
      {!w.list(table).length && (
        <Notice>
          {w.t(
            "لا توجد بيانات بعد. أضف أول سجل.",
            "No data yet. Add the first record.",
          )}
        </Notice>
      )}
      <div className="entity-list">
        {w.list(table).map((r) => (
          <article key={r.id}>
            <div>
              {link(r) ? (
                <Link href={link(r)}>
                  {table === "matches"
                    ? matchLabel(r, w.list("teams"))
                    : rowLabel(r)}
                </Link>
              ) : (
                <b>{rowLabel(r)}</b>
              )}
              <small>
                {s(r.primary_position || r.starts_at || r.description)}
              </small>
            </div>
            <div className="toolbar">
              <button
                disabled={!canWrite(w.role, table)}
                onClick={() => setEditing(r)}
              >
                {w.t("تعديل", "Edit")}
              </button>
              <button
                disabled={
                  !canWrite(w.role, table) ||
                  (table === "matches" &&
                    !["owner", "technical_director", "head_coach"].includes(
                      w.role,
                    ))
                }
                onClick={() => {
                  if (
                    window.confirm(
                      w.t(
                        "حذف هذا السجل وما يرتبط به؟",
                        "Delete this record and its dependent data?",
                      ),
                    )
                  )
                    void a.run(() => w.save(table, r, true));
                }}
              >
                {w.t("حذف", "Delete")}
              </button>
            </div>
          </article>
        ))}
      </div>
    </Panel>
  );
}
