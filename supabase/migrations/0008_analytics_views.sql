create or replace view public.v_event_metrics
with (security_invoker = true)
as
select
  e.organization_id,
  e.match_id,
  e.team_id,
  e.actor_player_id,
  e.period,
  e.phase,
  e.attack_system,
  e.defense_system,
  e.court_zone,
  count(*) filter (where e.event_type in ('shot','goal','save','miss','blocked_shot','seven_meter_shot')) as shot_events,
  count(*) filter (where e.event_type = 'goal') as goals,
  count(*) filter (where e.event_type = 'turnover') as turnovers,
  count(*) filter (where e.event_type = 'save') as saves
from public.events e
group by e.organization_id,e.match_id,e.team_id,e.actor_player_id,e.period,e.phase,e.attack_system,e.defense_system,e.court_zone;
