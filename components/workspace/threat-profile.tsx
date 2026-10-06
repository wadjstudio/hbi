"use client";
import { shotProfile } from "@/features/analysis/shot-profile";
import { percent, ratio } from "@/lib/analytics/metrics";
import type { Row } from "@/types/workspace";
import { useWorkspace } from "./provider";
export function ThreatProfile({
  shots,
  onEvidence,
}: {
  shots: Row[];
  onEvidence: (title: string, shots: Row[]) => void;
}) {
  const w = useWorkspace(),
    profile = shotProfile(shots);
  const max = Math.max(
    0.25,
    ...profile.groups.map((g) => g.shots.length / Math.max(1, profile.sample)),
  );
  const scale = Math.ceil(max * 4) / 4;
  const point = (i: number, r: number) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / profile.groups.length;
    return [140 + Math.cos(a) * r, 110 + Math.sin(a) * r] as const;
  };
  const polygon = (r: number) =>
    profile.groups.map((_, i) => point(i, r).join(",")).join(" ");
  const trace = profile.groups
    .map((g, i) =>
      point(
        i,
        (75 * g.shots.length) / Math.max(1, profile.sample) / scale,
      ).join(","),
    )
    .join(" ");
  return (
    <section className="intelligence-section threat-profile">
      <header>
        <h3>{w.t("مناطق التهديد", "Threat profile")}</h3>
        <small>n={profile.sample}</small>
      </header>
      <svg
        viewBox="0 0 280 220"
        role="img"
        aria-label={w.t("توزيع مناطق التصويب", "Shot origin distribution")}
      >
        {[0.25, 0.5, 0.75, 1].map((level) => (
          <polygon
            key={level}
            points={polygon(75 * level)}
            fill="none"
            stroke="#294455"
          />
        ))}
        {profile.groups.map((g, i) => {
          const p = point(i, 75),
            label = point(i, 98);
          return (
            <g key={g.key}>
              <line x1="140" y1="110" x2={p[0]} y2={p[1]} stroke="#294455" />
              <text
                x={label[0]}
                y={label[1]}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {w.t(g.ar, g.en)}
              </text>
            </g>
          );
        })}
        {profile.sample > 0 && (
          <polygon
            points={trace}
            fill="#ff6b3530"
            stroke="#ff873d"
            strokeWidth="2"
          />
        )}
      </svg>
      <div className="threat-zone-list">
        {profile.groups.map((g) => (
          <button
            key={g.key}
            disabled={!g.shots.length}
            onClick={() => onEvidence(w.t(g.ar, g.en), g.shots)}
          >
            <span>{w.t(g.ar, g.en)}</span>
            <b>{percent(ratio(g.shots.length, profile.sample))}</b>
            <small>
              {g.shots.length}/{profile.sample}
            </small>
          </button>
        ))}
      </div>
      <small>
        {w.t(
          "من المحاولات المراجعة · حد المحور",
          "Reviewed attempts · axis limit",
        )}{" "}
        {percent(scale)} · {profile.pending} {w.t("للمراجعة", "pending")}
      </small>
      <button
        className="evidence-text"
        disabled={!profile.missing.length}
        onClick={() =>
          onEvidence(
            w.t("مناطق ناقصة أو قديمة", "Missing or legacy origins"),
            profile.missing,
          )
        }
      >
        {profile.missing.length}{" "}
        {w.t("دون منطقة معروفة", "without known origin")}
      </button>
    </section>
  );
}
