import Link from "next/link";
import { BarChart3, Film, LayoutDashboard, ListVideo, ShieldHalf, Target, Trophy, UsersRound } from "lucide-react";

const items = [
  ["Overview", "/overview", LayoutDashboard],
  ["Matches", "/matches", Trophy],
  ["Opponents", "/opponents", ShieldHalf],
  ["Team", "/team", UsersRound],
  ["Players", "/players", Target],
  ["Video Lab", "/video-lab", Film],
  ["Playlists", "/playlists", ListVideo],
  ["Reports", "/reports", BarChart3],
] as const;

export function AppSidebar() {
  return (
    <aside className="border-b border-[var(--border)] bg-[var(--surface-1)] p-3 md:sticky md:top-0 md:h-screen md:border-b-0 md:border-r">
      <div className="flex items-center gap-3 px-2 py-4">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--intel-cyan)] font-black text-slate-950">H</div>
        <div><div className="text-lg font-black tracking-tight">HBI</div><div className="hbi-muted text-[10px] uppercase tracking-[.2em]">Handball Intelligence</div></div>
      </div>
      <nav className="mt-4 grid grid-cols-2 gap-1 md:grid-cols-1">
        {items.map(([label, href, Icon]) => (
          <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--surface-3)] hover:text-white">
            <Icon size={18} />{label}
          </Link>
        ))}
      </nav>
      <div className="mt-6 hidden rounded-xl border border-[var(--border)] bg-[var(--surface-2)] p-3 md:block">
        <div className="hbi-kicker">North star</div>
        <p className="hbi-muted mt-2 text-xs leading-5">No insight without evidence.</p>
      </div>
    </aside>
  );
}
