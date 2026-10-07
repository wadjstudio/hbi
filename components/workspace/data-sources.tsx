"use client";
import { useEffect, useRef, useState } from "react";
import { Database, ExternalLink, Search } from "lucide-react";
import {
  sources,
  reviewedAt,
  type SourceCategory,
  type SourceStatus,
} from "@/features/data-sources/catalog";
import {
  candidateExport,
  searchHandballPlayers,
  type PlayerCandidate,
} from "@/features/data-sources/wikidata";
import { useWorkspace, download } from "./provider";
import { Notice, Panel } from "./controls";

const categories: [SourceCategory | "all", string, string][] = [
  ["all", "كل المصادر", "All sources"],
  ["metadata", "فرق ولاعبون ونتائج", "Teams, players & results"],
  ["tracking", "تتبّع وفهم الفيديو", "Tracking & video understanding"],
  ["annotation", "مراجعة وتقييم", "Annotation & evaluation"],
];
const statuses: Record<SourceStatus, [string, string]> = {
  preview: ["معاينة متاحة", "Preview available"],
  candidate: ["مرشح للتكامل", "Integration candidate"],
  research: ["للبحث والتقييم", "Research & evaluation"],
  hold: ["غير معتمد للدمج", "Not adopted"],
};

function PlayerSearch() {
  const w = useWorkspace();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerCandidate[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function search() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(() => controller.abort(), 20000);
    setBusy(true);
    setResults([]);
    setError("");
    setSearched(false);
    try {
      const rows = await searchHandballPlayers(
        query,
        w.lang,
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setResults(rows);
        setSearched(true);
      }
    } catch (e) {
      if (request.current === controller)
        setError(
          controller.signal.aborted
            ? w.t(
                "توقّف الطلب أو انتهت مهلته. أعد المحاولة لاحقًا.",
                "Request stopped or timed out. Try again later.",
              )
            : w.t(
                "تعذر الوصول للمصدر. لم يتم استيراد أي بيانات. ",
                "Source unavailable. No data was imported. ",
              ) + (e instanceof Error ? e.message : String(e)),
        );
    } finally {
      clearTimeout(timeout);
      if (request.current === controller) setBusy(false);
    }
  }
  return (
    <Panel
      title={w.t(
        "ابحث عن لاعب يد · Wikidata",
        "Find a handball player · Wikidata",
      )}
    >
      <Notice>
        {w.t(
          "البحث اختياري ويرسل الاسم المكتوب فقط إلى Wikidata. النتائج أسماء عامة للمراجعة؛ لا تحدد فريق الموسم أو الأداء أو المركز. لا تُحمّل صورًا ولا تُعدّل سجلات المؤسسة.",
          "Optional search sends only the entered name to Wikidata. Public names need review; they do not establish season team, performance or position. No images are loaded and organization records are not modified.",
        )}
      </Notice>
      <form
        className="toolbar source-search"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <label>
          {w.t("اسم اللاعب أو معرّف Wikidata", "Player name or Wikidata ID")}
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            placeholder={w.t(
              "مثال: أحمد الأحمر أو Q18921300",
              "For example: Ahmed Elahmar or Q18921300",
            )}
          />
        </label>
        <button disabled={busy || !w.online || query.trim().length < 2}>
          <Search size={16} /> {w.t("بحث في Wikidata", "Search Wikidata")}
        </button>
        {busy && (
          <button type="button" onClick={() => request.current?.abort()}>
            {w.t("إيقاف", "Stop")}
          </button>
        )}
      </form>
      {!w.online && (
        <Notice>
          {w.t(
            "البحث يحتاج اتصالًا. دليل المصادر المحمّل يمكن قراءته دون اتصال.",
            "Search needs a connection. The loaded source guide remains readable offline.",
          )}
        </Notice>
      )}
      <div role="status" aria-live="polite">
        {busy && (
          <Notice>
            {w.t(
              "جارٍ البحث والتحقق من تصنيف كرة اليد…",
              "Searching and checking handball occupation…",
            )}
          </Notice>
        )}
        {error && <Notice>{error}</Notice>}
        {searched && !results.length && (
          <Notice>
            {w.t(
              "لم نجد لاعبًا بتصنيف مباشر لكرة اليد ضمن أول 6 نتائج. جرّب الاسم باللغة الأخرى؛ غياب النتيجة لا ينفي هوية اللاعب.",
              "No direct handball-player classification in the first six results. Try the other language; absence does not disprove identity.",
            )}
          </Notice>
        )}
      </div>
      <div className="source-results">
        {results.map((row) => (
          <article key={row.externalId}>
            <b>
              {(w.lang === "ar" ? row.labelAr : row.labelEn) ??
                row.labelEn ??
                row.labelAr}
            </b>
            <span>
              {row.labelAr ?? "—"} / {row.labelEn ?? "—"}
            </span>
            <p>
              {(w.lang === "ar" ? row.descriptionAr : row.descriptionEn) ?? "—"}
            </p>
            <small>
              Wikidata · {row.externalId} · CC0 ·{" "}
              {w.t("غير مراجع", "Unreviewed")}
            </small>
            <a href={row.sourceUrl} target="_blank" rel="noreferrer">
              {w.t("افتح نسخة المصدر", "Open source revision")}{" "}
              <ExternalLink size={14} />
            </a>
          </article>
        ))}
      </div>
      {!!results.length && (
        <button
          onClick={() =>
            download(
              candidateExport(results),
              "sesen-player-candidates.json",
              "application/json",
            )
          }
        >
          {w.t(
            "تصدير الأسماء والمصادر للمراجعة",
            "Export names and sources for review",
          )}
        </button>
      )}
    </Panel>
  );
}

export function DataSources() {
  const w = useWorkspace();
  const [category, setCategory] = useState<SourceCategory | "all">("all");
  const visible = sources.filter(
    (source) => category === "all" || source.category === category,
  );
  return (
    <div className="data-sources">
      <Panel
        title={w.t("مصادر معرفة SESEN", "SESEN knowledge sources")}
        actions={<Database size={21} />}
      >
        <p>
          {w.t(
            "بيانات موثقة للفريق، وأدوات لتطوير التحليل وقياس جودته. حالة كل مصدر توضح ما يعمل الآن وما يحتاج تجربة أو ترخيصًا.",
            "Documented team data and tools to develop and evaluate analysis. Each status distinguishes working functionality from leads requiring trials or permission.",
          )}
        </p>
        <small>
          {w.t("آخر مراجعة للمصادر", "Sources last reviewed")}: {reviewedAt}
        </small>
      </Panel>
      {/* Key remount also clears unsaved public search results on account/organization changes. */}
      <PlayerSearch key={`${w.user}:${w.org}`} />
      <div
        className="toolbar"
        role="group"
        aria-label={w.t("نوع المصدر", "Source category")}
      >
        {categories.map(([value, ar, en]) => (
          <button
            key={value}
            aria-pressed={category === value}
            onClick={() => setCategory(value)}
          >
            {w.t(ar, en)}
          </button>
        ))}
      </div>
      <div className="source-grid">
        {visible.map((source) => (
          <article className="source-card" key={source.id}>
            <header>
              <h2>{source.name}</h2>
              <span className={`source-status source-${source.status}`}>
                {w.t(...statuses[source.status])}
              </span>
            </header>
            <p>{w.t(source.ar, source.en)}</p>
            <small dir="ltr">{source.license}</small>
            <a href={source.url} target="_blank" rel="noreferrer">
              {w.t("التوثيق والمصدر", "Documentation & source")}{" "}
              <ExternalLink size={14} />
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
