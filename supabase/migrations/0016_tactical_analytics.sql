-- Canonical taxonomy analytics. Defensive descriptors belong to the defending team.
create view public.v_tactical_observations with (security_invoker=true) as
select p.organization_id,p.id possession_id,p.match_id,p.analysis_session_id,
 t.id term_id,t.category,t.code,t.label_ar,t.label_en,
 case when t.category in ('defense_system','defense_behavior')
 then case when p.team_id=m.home_team_id then m.away_team_id else m.home_team_id end
 else p.team_id end as observed_team_id
from public.possession_tactics pt
join public.possessions p on p.id=pt.possession_id
join public.tactical_terms t on t.id=pt.term_id
join public.matches m on m.id=p.match_id
join public.analysis_sessions a on a.id=p.analysis_session_id and a.is_primary;
grant select on public.v_tactical_observations to authenticated;
revoke all on public.v_tactical_observations from anon;
create function public.get_tactical_distribution(p_team_id uuid,p_match_ids uuid[] default null)
returns table(term_id uuid,category text,code text,label_ar text,label_en text,possessions bigint,tagged_possessions bigint,share numeric)
language sql stable security invoker set search_path=public as $$
with sample as(select * from public.v_tactical_observations where observed_team_id=p_team_id and (p_match_ids is null or match_id=any(p_match_ids))),
totals as(select s.category,count(distinct s.possession_id) n from sample s group by s.category)
select s.term_id,s.category,s.code,s.label_ar,s.label_en,count(distinct s.possession_id),t.n,
 count(distinct s.possession_id)::numeric/nullif(t.n,0)
from sample s join totals t on t.category=s.category
group by s.term_id,s.category,s.code,s.label_ar,s.label_en,t.n;
$$;
revoke all on function public.get_tactical_distribution(uuid,uuid[]) from public;
grant execute on function public.get_tactical_distribution(uuid,uuid[]) to authenticated;
