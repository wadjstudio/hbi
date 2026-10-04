create or replace function public.create_organization(p_name text, p_slug text, p_country_code text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_org uuid;
begin
  if v_user is null then raise exception 'authentication required'; end if;
  insert into public.organizations(name, slug, country_code, created_by)
  values(trim(p_name), lower(trim(p_slug)), p_country_code, v_user)
  returning id into v_org;
  insert into public.organization_members(organization_id, user_id, role)
  values(v_org, v_user, 'owner');
  return v_org;
end;
$$;

revoke all on function public.create_organization(text,text,text) from public;
grant execute on function public.create_organization(text,text,text) to authenticated;

create or replace function public.get_defense_system_distribution(
  p_team_id uuid,
  p_match_ids uuid[] default null
)
returns table(defense_system public.defense_system, possessions bigint, share numeric)
language sql
stable
security invoker
as $$
  with sample as (
    select p.opponent_defense
    from public.possessions p
    where p.team_id = p_team_id
      and (p_match_ids is null or p.match_id = any(p_match_ids))
      and p.opponent_defense is not null
  ), totals as (select count(*)::numeric n from sample)
  select s.opponent_defense,
         count(*)::bigint,
         case when t.n = 0 then 0 else round(count(*)::numeric / t.n, 4) end
  from sample s cross join totals t
  group by s.opponent_defense, t.n
  order by count(*) desc;
$$;

grant execute on function public.get_defense_system_distribution(uuid, uuid[]) to authenticated;

create or replace function public.get_team_attack_summary(
  p_team_id uuid,
  p_match_ids uuid[] default null
)
returns jsonb
language sql
stable
security invoker
as $$
  with e as (
    select * from public.events
    where team_id = p_team_id
      and (p_match_ids is null or match_id = any(p_match_ids))
  ), p as (
    select * from public.possessions
    where team_id = p_team_id
      and (p_match_ids is null or match_id = any(p_match_ids))
  )
  select jsonb_build_object(
    'possessions', (select count(*) from p),
    'goals', (select count(*) from e where event_type='goal'),
    'shots', (select count(*) from e where event_type in ('shot','goal','save','miss','blocked_shot','seven_meter_shot')),
    'turnovers', (select count(*) from e where event_type='turnover')
  );
$$;

grant execute on function public.get_team_attack_summary(uuid, uuid[]) to authenticated;
