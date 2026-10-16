import { s, type Row } from "@/types/workspace";

export const meetingItem = (
  organizationId: string,
  item: Row | undefined,
  sources: { clips: Row[]; tactics: Row[]; insights: Row[] },
) => {
  const missing = { kind: "missing" as const, target: undefined };
  if (!item || item.organization_id !== organizationId) return missing;
  const fields = ["clip_id", "tactic_id", "insight_id"].filter(
    (key) => item[key],
  );
  const hasText = Boolean(s(item.body).trim());
  if (fields.length + Number(hasText) !== 1) return missing;
  if (hasText) return { kind: "text" as const, target: item };
  const field = fields[0]!;
  const kind =
    field === "clip_id"
      ? ("clip" as const)
      : field === "tactic_id"
        ? ("tactic" as const)
        : ("insight" as const);
  const rows =
    kind === "clip"
      ? sources.clips
      : kind === "tactic"
        ? sources.tactics
        : sources.insights;
  const target = rows.find(
    (row) => row.id === item[field] && row.organization_id === organizationId,
  );
  return target ? { kind, target } : missing;
};
