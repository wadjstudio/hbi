"use client";
import { useWorkspace } from "./provider";
import { Panel, SelectRow, type useAction } from "./controls";
import { Court } from "./charts";
import { brand } from "@/lib/brand";
import { analysisLabel } from "@/features/analysis/labels";
import { canWrite } from "@/lib/permissions/roles";
import type { EventForm } from "@/features/analysis/use-event-form";
import { s, type Row } from "@/types/workspace";

export function EventEditor({
  form,
  editId,
  editorOpen,
  onToggle,
  onFinishEdit,
  teams,
  players,
  keepers,
  sid,
  possessionOpen,
  action,
  record,
  startPossession,
  endPossession,
}: {
  form: EventForm;
  editId: string;
  editorOpen: boolean;
  onToggle: () => void;
  onFinishEdit: () => void;
  teams: Row[];
  players: Row[];
  keepers: Row[];
  sid: string;
  possessionOpen: boolean;
  action: ReturnType<typeof useAction>;
  record: () => Promise<void>;
  startPossession: () => Promise<void>;
  endPossession: () => Promise<void>;
}) {
  const w = useWorkspace();
  const {
    templateId, setTemplate, team, setTeam, actor, setActor, keeper, setKeeper,
    eventType, setEventType, phase, setPhase, eventX, setEventX, eventY,
    setEventY, result, setResult, empty, setEmpty, shotType, setShotType,
    distance, setDistance, rebound, setRebound, fastBreak, setFastBreak, zone,
    setZone, outcome, setOutcome, scoreFor, setScoreFor, scoreAgainst,
    setScoreAgainst, numericalFor, setNumericalFor, numericalAgainst,
    setNumericalAgainst, note, setNote, terms, setTerms, setPre, setPost,
  } = form;
  return (
    <details className="event-editor" open={editorOpen || Boolean(editId)}>
      <summary
        onClick={(e) => {
          e.preventDefault();
          onToggle();
        }}
      >
        {w.t(
          "تفاصيل التسجيل · الفريق والمشاركون والسياق",
          "Tagging details · team, participants & context",
        )}
      </summary>
      <fieldset disabled={!canWrite(w.role, "events") || action.busy}>
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
                key?: string;
                event_type: string;
                pre_seconds: number;
                post_seconds: number;
              }[]
            ).map((button, i) => (
              <button
                type="button"
                key={i}
                title={
                  button.key
                    ? `${button.label} (${button.key.toUpperCase()})`
                    : button.label
                }
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
              void action.run(record);
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
                    <option key={v} value={v}>
                      {analysisLabel(v, w.lang)}
                    </option>
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
                    "other",
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
                    <option key={v} value={v}>
                      {analysisLabel(v, w.lang)}
                    </option>
                  ))}
                </select>
              </label>
              {eventType !== "shot" && (
                <fieldset className="event-court-editor">
                  <legend>
                    {w.t("موقع الحدث على الملعب", "Event court position")}
                  </legend>
                  <Court
                    onClick={(x, y) => {
                      setEventX(x.toFixed(3));
                      setEventY(y.toFixed(3));
                    }}
                  >
                    {eventX !== "" && eventY !== "" && (
                      <circle
                        cx={Number(eventX) * 1000}
                        cy={Number(eventY) * 500}
                        r="18"
                        fill={brand.colors.cyan}
                      />
                    )}
                  </Court>
                  <label>
                    {w.t(
                      "الإحداثي الأفقي للحدث",
                      "Event horizontal coordinate",
                    )}
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step=".001"
                      value={eventX}
                      onChange={(e) => setEventX(e.target.value)}
                    />
                  </label>
                  <label>
                    {w.t(
                      "الإحداثي الرأسي للحدث",
                      "Event vertical coordinate",
                    )}
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step=".001"
                      value={eventY}
                      onChange={(e) => setEventY(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setEventX("");
                      setEventY("");
                    }}
                  >
                    {w.t("مسح الموقع", "Clear position")}
                  </button>
                  <small>
                    {w.t(
                      "اختياري · اضغط الملعب أو أدخل الإحداثيين. يُمسح الموقع بعد التسجيل.",
                      "Optional · click the court or enter both coordinates. Position clears after recording.",
                    )}
                  </small>
                </fieldset>
              )}
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
                          <option key={v} value={v}>
                            {analysisLabel(v, w.lang)}
                          </option>
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
                        <option key={v} value={v}>
                          {analysisLabel(v, w.lang)}
                        </option>
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
                        "unknown",
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
                        <option key={v} value={v}>
                          {analysisLabel(v, w.lang)}
                        </option>
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
                      <option key={v} value={v}>
                        {analysisLabel(v, w.lang)}
                      </option>
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
                  onChange={(e) =>
                    setNumericalAgainst(Number(e.target.value))
                  }
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
              disabled={action.busy || !sid || w.role === "viewer"}
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
              onClick={() => void action.run(startPossession)}
            >
              {w.t("بدء هجمة", "Start possession")}
            </button>
            <button
              disabled={!possessionOpen}
              onClick={() => void action.run(endPossession)}
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
        {editId && (
          <button onClick={onFinishEdit}>
            {w.t("إنهاء تحرير الحدث", "Finish editing event")}
          </button>
        )}
      </fieldset>
    </details>
  );
}
