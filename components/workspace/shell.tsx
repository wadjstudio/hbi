"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useWorkspace } from "./provider";
import { Panel, Notice, useAction, rowLabel } from "./controls";
import {
  LayoutDashboard,
  CalendarDays,
  Target,
  Users,
  CircleUser,
  Film,
  Crosshair,
  ListVideo,
  Presentation,
  BarChart3,
  Settings,
} from "lucide-react";
const navigation = [
  ["نظرة عامة", "Overview", "/overview"],
  ["المباريات", "Matches", "/matches"],
  ["الخصوم", "Opponents", "/opponents"],
  ["الفريق", "Team", "/team"],
  ["اللاعبون", "Players", "/players"],
  ["معمل الفيديو", "Video Lab", "/video-lab"],
  ["التكتيكات", "Tactics", "/tactics"],
  ["قوائم المقاطع", "Playlists", "/playlists"],
  ["الاجتماعات", "Meetings", "/meetings"],
  ["التقارير", "Reports", "/reports"],
  ["الإعدادات", "Settings", "/settings"],
] as const;
const navigationIcons = [
  LayoutDashboard,
  CalendarDays,
  Target,
  Users,
  CircleUser,
  Film,
  Crosshair,
  ListVideo,
  Presentation,
  BarChart3,
  Settings,
];
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const w = useWorkspace(),
    path = usePathname(),
    a = useAction();
  const [sync, setSync] = useState(false),
    [name, setName] = useState(""),
    [slug, setSlug] = useState("");
  return (
    <div className="workspace-shell hbi-shell">
      <aside className="sidebar">
        <Link href="/overview" className="brand">
          <strong>HBI</strong>
          <span>
            HANDBALL
            <br />
            INTELLIGENCE
          </span>
        </Link>
        <nav>
          {navigation.map(([ar, en, href], index) => {
            const Icon = navigationIcons[index] ?? LayoutDashboard;
            return (
              <Link
                className={path.startsWith(href) ? "active" : ""}
                key={href}
                href={href}
              >
                <Icon size={19} />
                <span>{w.t(ar, en)}</span>
              </Link>
            );
          })}
        </nav>
        <p className="motto">
          {w.t("حلّل · افهم · استعد", "ANALYZE · UNDERSTAND · PREPARE")}
          <br />
          <b>WIN</b>
        </p>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <span className="workspace-breadcrumb">
            {w.t("مساحة المحلل", "Analyst workspace")}
          </span>
          <select
            aria-label="Organization"
            value={w.org}
            onChange={(e) => w.selectOrg(e.target.value)}
          >
            <option value="">{w.t("المؤسسة", "Organization")}</option>
            {w.orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {rowLabel(o)}
              </option>
            ))}
          </select>
          <span className="status">
            {w.online ? w.t("متصل", "Online") : w.t("دون اتصال", "Offline")} ·{" "}
            {w.pending.length} {w.t("بانتظار الحفظ", "pending")}
          </span>
          <button onClick={() => setSync(!sync)}>
            {w.t("المزامنة والنسخ", "Sync & backup")}
          </button>
          <button onClick={() => w.setLang(w.lang === "ar" ? "en" : "ar")}>
            {w.lang === "ar" ? "English" : "العربية"}
          </button>
          <button onClick={() => void w.logout()}>
            {w.t("خروج", "Sign out")}
          </button>
        </header>
        <main>
          {(w.error || a.error) && <Notice>{w.error || a.error}</Notice>}
          {sync && (
            <Panel title={w.t("الحفظ والمزامنة", "Save & sync")}>
              <div className="toolbar">
                <button onClick={() => void w.flush()}>
                  {w.t("مزامنة", "Sync")}
                </button>
                <button onClick={() => void w.reload()}>
                  {w.t("تحديث", "Refresh")}
                </button>
                <button onClick={() => void w.backup()}>
                  {w.t("نسخة احتياطية", "Export backup")}
                </button>
                <label className="file-button">
                  {w.t("استعادة", "Restore")}
                  <input
                    type="file"
                    accept="application/json"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void a.run(() => w.restore(f));
                    }}
                  />
                </label>
              </div>
              {w.pending.map((op) => (
                <article className="sync-operation" key={op.id}>
                  <b>{op.table}</b> · {op.error ?? w.t("انتظار", "Pending")}
                  {op.error === "conflict" ? (
                    <>
                      <details>
                        <summary>
                          {w.t("عرض النسختين", "Compare versions")}
                        </summary>
                        <pre>
                          {JSON.stringify(
                            { local: op.row, server: op.conflict },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                      <button onClick={() => void w.resolve(op.id, "local")}>
                        {w.t("الاحتفاظ بتعديلي", "Keep my change")}
                      </button>
                      <button onClick={() => void w.resolve(op.id, "server")}>
                        {w.t("اعتماد نسخة الخادم", "Use server version")}
                      </button>
                    </>
                  ) : op.error ? (
                    <>
                      <button onClick={() => void w.resolve(op.id, "local")}>
                        {w.t("إعادة إرسال آخر تعديل", "Resend latest edit")}
                      </button>
                      <button
                        onClick={() =>
                          void a.run(async () => {
                            const { localDB } =
                              await import("@/lib/local/database");
                            await localDB.operations.update(op.id, {
                              error: undefined,
                            });
                            await w.flush();
                          })
                        }
                      >
                        {w.t("إعادة المحاولة", "Retry")}
                      </button>
                    </>
                  ) : null}
                </article>
              ))}
            </Panel>
          )}
          {!w.org ? (
            <Panel title={w.t("إنشاء المؤسسة", "Create organization")}>
              <form
                className="editor"
                onSubmit={(e) => {
                  e.preventDefault();
                  void a.run(() => w.createOrg(name, slug));
                }}
              >
                <label>
                  {w.t("الاسم", "Name")}
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label>
                  {w.t("المعرّف", "Slug")}
                  <input
                    required
                    pattern="[a-z0-9-]+"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </label>
                <button className="primary">{w.t("إنشاء", "Create")}</button>
              </form>
            </Panel>
          ) : !w.ready ? (
            <Notice>{w.t("تحميل مساحة العمل…", "Loading workspace…")}</Notice>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
