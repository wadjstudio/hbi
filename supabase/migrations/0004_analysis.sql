create type public.phase_type as enum (
  'positional_attack','fast_break','second_wave','transition_defense','set_defense',
  'seven_vs_six','empty_goal','power_play','short_handed','timeout','other'
);
create type public.event_type as enum (
  'possession_start','possession_end','shot','goal','save','miss','blocked_shot','turnover',
  'steal','assist','technical_error','seven_meter_won','seven_meter_shot','two_minute_penalty',
  'yellow_card','red_card','timeout','substitution','offensive_foul','defensive_foul','block','duel','custom'
);
create type public.event_outcome as enum ('success','failure','neutral','unknown');
create type public.attack_system as enum (
  'unknown','standard_6v6','seven_vs_six','two_pivots','cross','double_cross','wing_entry',
  'pivot_entry','backcourt','fast_break','second_wave','custom'
);
create type public.defense_system as enum (
  'unknown','six_zero','five_one','three_two_one','four_two','three_three','man_to_man','mixed','custom'
);
create type public.court_zone as enum (
  'lw','left_half','center','right_half','rw','pivot_left','pivot_center','pivot_right','seven_meter',
  'nine_meter_left','nine_meter_center','nine_meter_right','backcourt_left','backcourt_center','backcourt_right','unknown'
);
create type public.event_participant_role as enum ('actor','assister','passer','receiver','defender','goalkeeper','victim','other');

create table public.possessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  team_id uuid not null references public.teams(id),
  sequence_no integer not null,
  period smallint not null check(period in (1,2,3,4)),
  start_ms bigint not null,
  end_ms bigint,
  phase public.phase_type not null,
  attack_system public.attack_system,
  opponent_defense public.defense_system,
  score_for smallint,
  score_against smallint,
  numerical_for smallint default 6,
  numerical_against smallint default 6,
  result public.event_type,
  created_at timestamptz not null default now(),
  check(end_ms is null or end_ms >= start_ms),
  unique(analysis_session_id, sequence_no)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  match_id uuid not null references public.matches(id) on delete cascade,
  possession_id uuid references public.possessions(id) on delete cascade,
  team_id uuid references public.teams(id),
  actor_player_id uuid references public.players(id),
  timestamp_ms bigint not null,
  end_ms bigint,
  period smallint not null check(period in (1,2,3,4)),
  event_type public.event_type not null,
  outcome public.event_outcome not null default 'unknown',
  phase public.phase_type,
  attack_system public.attack_system,
  defense_system public.defense_system,
  court_zone public.court_zone,
  shot_x numeric(6,3) check(shot_x between 0 and 1),
  shot_y numeric(6,3) check(shot_y between 0 and 1),
  goal_x numeric(6,3) check(goal_x between 0 and 1),
  goal_y numeric(6,3) check(goal_y between 0 and 1),
  numerical_for smallint,
  numerical_against smallint,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check(end_ms is null or end_ms >= timestamp_ms)
);

create table public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  player_id uuid not null references public.players(id),
  role public.event_participant_role not null,
  primary key(event_id, player_id, role)
);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  color_key text,
  created_at timestamptz not null default now(),
  unique(organization_id, name)
);

create table public.event_tags (
  event_id uuid not null references public.events(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key(event_id, tag_id)
);
