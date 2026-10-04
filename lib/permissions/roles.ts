import type { Table } from "@/types/workspace";
export function canWrite(role: string, table: Table) {
  if (role === "viewer") return false;
  if (["teams", "team_players"].includes(table))
    return ["owner", "technical_director", "head_coach"].includes(role);
  if (["seasons", "competitions"].includes(table))
    return ["owner", "technical_director"].includes(role);
  return [
    "owner",
    "technical_director",
    "head_coach",
    "assistant_coach",
    "analyst",
  ].includes(role);
}
