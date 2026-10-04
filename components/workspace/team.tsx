"use client";
import { useWorkspace } from "./provider";
import { Entities } from "./entities";
import { Analytics } from "./analytics";
export function TeamPage() {
  const w = useWorkspace();
  return (
    <>
      <Entities table="teams" title={w.t("إدارة الفريق", "Team management")} />
      <Entities
        table="team_players"
        title={w.t("قائمة الموسم", "Season roster")}
      />
      <Analytics />
    </>
  );
}
export function PlayersPage() {
  const w = useWorkspace();
  return (
    <Entities
      table="players"
      title={w.t("اللاعبون والحراس", "Players & goalkeepers")}
    />
  );
}
export function MatchesPage() {
  const w = useWorkspace();
  return <Entities table="matches" title={w.t("المباريات", "Matches")} />;
}
