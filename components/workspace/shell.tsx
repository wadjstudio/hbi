"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BrandLockup, BrandMark } from "@/components/brand/brand-lockup";
import { IdentityImage } from "@/components/brand/identity-image";
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
  Menu,
  X,
  Bell,
  ChevronDown,
  Database,
} from "lucide-react";
const navigation = [
  ["نظرة عامة", "Overview", "/overview"],
  ["المباريات", "Matches", "/matches"],
  ["الخصوم", "Opponents", "/opponents"],
  ["الفريق", "Team", "/team"],
  ["اللاعبون", "Players", "/players"],
  ["معمل الفيديو", "Video Lab", "/video-lab"],
  ["التكتيكات", "Tactics", "/tactics"],
  ["التقارير", "Reports", "/reports"],
  ["قوائم المقاطع", "Playlists", "/playlists"],
  ["الاجتماعات", "Meetings", "/meetings"],
  ["مصادر البيانات", "Data sources", "/data-sources"],
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
  BarChart3,
  ListVideo,
  Presentation,
  Database,
  Settings,
];
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const w = useWorkspace(),
    path = usePathname(),
    a = useAction();
  const [sync, setSync] = useState(false),
    [name, setName] = useState(""),
    [slug, setSlug] = useState("");
  const drawer = useRef<HTMLDialogElement>(null);
  const accountMenu = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !accountMenu.current?.contains(event.target) &&
        accountMenu.current
      )
        accountMenu.current.open = false;
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);
  const role =
    (
      {
        owner: w.t("مالك المؤسسة", "Owner"),
        technical_director: w.t("مدير فني", "Technical director"),
        head_coach: w.t("مدرب رئيسي", "Head coach"),
        assistant_coach: w.t("مدرب مساعد", "Assistant coach"),
        analyst: w.t("محلل", "Analyst"),
        viewer: w.t("مشاهد", "Viewer"),
      } as Record<string, string>
    )[w.role] ?? w.role;
  const nav = (mobile = false) => (
    <nav aria-label={w.t("التنقل الرئيسي", "Main navigation")}>
      {navigation.map(([ar, en, href], index) => {
        const Icon = navigationIcons[index] ?? LayoutDashboard;
        const active = path.startsWith(href);
        return (
          <Link
            className={active ? "active" : ""}
            data-secondary={index >= 8 ? "true" : undefined}
            aria-current={active ? "page" : undefined}
            aria-label={w.t(ar, en)}
            title={w.t(ar, en)}
            key={href}
            href={href}
            onClick={() => {
              if (mobile) drawer.current?.close();
            }}
          >
            <Icon size={21} aria-hidden="true" />
            <span>{w.t(ar, en)}</span>
          </Link>
        );
      })}
    </nav>
  );
  return (
    <div className="workspace-shell hbi-shell sesen-shell">
      <aside className="sidebar">
        <Link
          href="/overview"
          className="brand"
          aria-label="SESEN — Sports Intelligence"
        >
          <BrandLockup />
          <span className="compact-brand">
            <BrandMark size={36} />
          </span>
        </Link>
        {nav()}
        <p className="motto">
          {w.t("حلّل · افهم · استعد", "ANALYZE · UNDERSTAND · PREPARE")}
          <br />
          <b>WIN</b>
        </p>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <button
            className="mobile-menu-button"
            aria-label={w.t("فتح القائمة", "Open navigation")}
            onClick={() => drawer.current?.showModal()}
          >
            <Menu size={22} />
          </button>
          <Link
            className="mobile-brand header-brand"
            href="/overview"
            aria-label="SESEN — Sports Intelligence"
          >
            <BrandLockup />
          </Link>
          <div id="match-header-slot" className="match-header-slot">
            <span className="workspace-breadcrumb">
              {w.t("مساحة المحلل", "Analyst workspace")}
            </span>
          </div>
          <div className="workspace-utilities">
            <span className="status workspace-save-status" role="status">
              {w.online ? w.t("متصل", "Online") : w.t("دون اتصال", "Offline")} ·{" "}
              {w.pending.length} {w.t("بانتظار الحفظ", "pending")}
            </span>
            <button
              aria-label={w.t("المزامنة والنسخ", "Sync & backup")}
              title={w.t("المزامنة والنسخ", "Sync & backup")}
              aria-expanded={sync}
              onClick={() => setSync(!sync)}
            >
              <Bell size={19} aria-hidden="true" />
              {w.pending.length > 0 && (
                <i className="sync-badge" aria-hidden="true">
                  {w.pending.length}
                </i>
              )}
            </button>
            <button
              className="language-button"
              onClick={() => w.setLang(w.lang === "ar" ? "en" : "ar")}
            >
              {w.lang === "ar" ? "English" : "العربية"}
            </button>
            <details
              ref={accountMenu}
              className="account-menu"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.currentTarget.open = false;
                  e.currentTarget.querySelector("summary")?.focus();
                }
              }}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget))
                  e.currentTarget.open = false;
              }}
            >
              <summary
                aria-label={w.t("الحساب والحفظ", "Account & sync")}
                title={w.t("الحساب والحفظ", "Account & sync")}
              >
                <i className="account-avatar" aria-hidden="true">
                  <IdentityImage
                    src={w.account.avatarUrl}
                    alt=""
                    width={32}
                    height={32}
                    loading="eager"
                    fallback={
                      <>{w.account.initials || <CircleUser size={22} />}</>
                    }
                  />
                </i>
                <span className="account-identity">
                  <b dir="auto">{w.account.name || w.t("الحساب", "Account")}</b>
                  <small>{role}</small>
                </span>
                <ChevronDown size={13} aria-hidden="true" />
              </summary>
              <div className="account-menu-content">
                <p className="account-email" dir="auto">
                  {w.account.email || w.t("بريد غير متاح", "Email unavailable")}
                </p>
                <small>
                  {role} ·{" "}
                  {w.orgs.find((o) => o.id === w.org)
                    ? rowLabel(w.orgs.find((o) => o.id === w.org)!)
                    : w.t("لا توجد مؤسسة", "No organization")}
                </small>
                <label>
                  {w.t("المؤسسة", "Organization")}
                  <select
                    aria-label="Organization"
                    value={w.org}
                    onChange={(e) => w.selectOrg(e.target.value)}
                  >
                    {!w.org && (
                      <option value="">{w.t("المؤسسة", "Organization")}</option>
                    )}
                    {w.orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {rowLabel(o)}
                      </option>
                    ))}
                  </select>
                </label>
                <Link
                  href="/settings"
                  onClick={() => {
                    if (accountMenu.current) accountMenu.current.open = false;
                  }}
                >
                  {w.t("إعدادات مساحة العمل", "Workspace settings")}
                </Link>
                <button onClick={() => void w.logout()}>
                  {w.t("خروج", "Sign out")}
                </button>
              </div>
            </details>
          </div>
        </header>
        <dialog
          ref={drawer}
          className="mobile-navigation"
          aria-label={w.t("التنقل الرئيسي", "Main navigation")}
        >
          <header>
            <BrandLockup />
            <button
              aria-label={w.t("إغلاق القائمة", "Close navigation")}
              onClick={() => drawer.current?.close()}
            >
              <X size={22} />
            </button>
          </header>
          {nav(true)}
        </dialog>
        <main>
          {(w.error || a.error) && <Notice>{w.error || a.error}</Notice>}
          {sync && (
            <Panel title={w.t("الحفظ والمزامنة", "Save & sync")}>
              <p>
                {w.online ? w.t("متصل", "Online") : w.t("دون اتصال", "Offline")}{" "}
                · {w.pending.length} {w.t("عملية معلقة", "pending operations")}
              </p>
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
