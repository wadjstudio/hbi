-- Additive upgrade: legacy events and taxonomy columns remain available.
create extension if not exists btree_gist;
create table public.tactical_terms (
 id uuid primary key default gen_random_uuid(), organization_id uuid references public.organizations(id) on delete cascade,
 category text not null check(category in ('phase','formation','attack_action','defense_system','defense_behavior','shot_type')),
 code text not null, label_ar text not null, label_en text not null, archived boolean not null default false,
 created_at timestamptz not null default now(), unique nulls not distinct(organization_id,category,code)
);
insert into public.tactical_terms(category,code,label_ar,label_en) values
 ('phase','positional_attack','هجوم منظم','Positional attack'),('phase','fast_break','هجوم سريع','Fast break'),
 ('phase','second_wave','موجة ثانية','Second wave'),('phase','transition_defense','عودة دفاعية','Defensive transition'),('phase','set_defense','دفاع منظم','Set defense'),
 ('formation','6v6','ستة ضد ستة','6v6'),('formation','7v6','سبعة ضد ستة','7v6'),('formation','two_pivots','دائرتان','Two pivots'),
 ('attack_action','cross','تقاطع','Cross'),('attack_action','double_cross','تقاطع مزدوج','Double cross'),('attack_action','screen','حجز','Screen'),
 ('attack_action','pivot_cooperation','تعاون مع الدائرة','Pivot cooperation'),('attack_action','wing_entry','دخول جناح','Wing entry'),
 ('attack_action','position_exchange','تبادل مراكز','Position exchange'),('attack_action','isolation','عزل فردي','Isolation'),
 ('attack_action','breakthrough','اختراق','Breakthrough'),('attack_action','overload','تحميل جهة','Overload'),
 ('defense_system','6:0','٦:٠','6:0'),('defense_system','5:1','٥:١','5:1'),('defense_system','3:2:1','٣:٢:١','3:2:1'),
 ('defense_system','4:2','٤:٢','4:2'),('defense_system','3:3','٣:٣','3:3'),('defense_system','man_to_man','رجل لرجل','Man to man'),('defense_system','mixed','مختلط','Mixed'),
 ('defense_behavior','step_out','تقدم','Step out'),('defense_behavior','cover','تغطية','Cover'),('defense_behavior','switch','تبديل','Switch'),
 ('defense_behavior','help','مساعدة','Help'),('defense_behavior','retreat','عودة','Retreat'),('defense_behavior','press','ضغط','Press'),
 ('shot_type','jump','وثب','Jump'),('shot_type','standing','ثبات','Standing'),('shot_type','breakthrough','اختراق','Breakthrough'),
 ('shot_type','wing','جناح','Wing'),('shot_type','pivot','دائرة','Pivot'),('shot_type','7m','سبعة أمتار','7m'),('shot_type','lob','لوب','Lob');

create table public.video_clock_segments (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
 period smallint not null check(period between 1 and 4), video_start_ms bigint not null check(video_start_ms>=0),
 video_end_ms bigint not null, clock_start_ms bigint not null check(clock_start_ms>=0), running boolean not null default true,
 check(video_end_ms>video_start_ms),
 exclude using gist (analysis_session_id with =, int8range(video_start_ms,video_end_ms,'[)') with &&)
);
alter table public.events add column match_clock_ms bigint check(match_clock_ms>=0);
alter table public.events add column actor_position public.player_position;
alter table public.events add column score_for smallint check(score_for>=0);
alter table public.events add column score_against smallint check(score_against>=0);
alter table public.possessions add column review_status text not null default 'draft' check(review_status in ('draft','reviewed'));
create table public.possession_tactics (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 possession_id uuid not null references public.possessions(id) on delete cascade,
 term_id uuid not null references public.tactical_terms(id), sequence_no integer not null default 0,
 unique(possession_id,term_id)
);
create table public.shot_attempts (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 event_id uuid not null unique references public.events(id) on delete cascade,
 shooter_id uuid references public.players(id), goalkeeper_id uuid references public.players(id),
 shooter_position public.player_position, result text not null check(result in ('goal','save','miss','blocked','unknown')),
 empty_goal boolean not null default false, zone public.court_zone, distance_m numeric check(distance_m>=0),
 shot_type_id uuid references public.tactical_terms(id), court_x numeric check(court_x between 0 and 1),court_y numeric check(court_y between 0 and 1),
 goal_x numeric check(goal_x between 0 and 1),goal_y numeric check(goal_y between 0 and 1),
 rebound text check(rebound in ('attacking_team','defending_team','out','unknown')), starts_fast_break boolean,
 review_required boolean not null default false, check(not empty_goal or goalkeeper_id is null)
);
create table public.legacy_shot_reviews (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 event_id uuid not null unique references public.events(id) on delete cascade, reason text not null, resolved boolean not null default false
);
-- Never infer a goalkeeper or merge nearby actions merely by timestamp.
insert into public.shot_attempts(organization_id,event_id,shooter_id,result,zone,court_x,court_y,goal_x,goal_y,review_required)
 select e.organization_id,e.id,e.actor_player_id,case e.event_type when 'goal' then 'goal' when 'miss' then 'miss' when 'blocked_shot' then 'blocked' else 'unknown' end,
 e.court_zone,e.shot_x,e.shot_y,e.goal_x,e.goal_y,true
 from public.events e where e.event_type in ('goal','miss','blocked_shot') and not exists(
 select 1 from public.events other where other.analysis_session_id=e.analysis_session_id and other.id<>e.id
 and other.timestamp_ms=e.timestamp_ms and other.event_type in ('shot','goal','save','miss','blocked_shot','seven_meter_shot'));
insert into public.legacy_shot_reviews(organization_id,event_id,reason)
 select e.organization_id,e.id,'Legacy attribution or duplicate requires analyst review' from public.events e
 where e.event_type in ('shot','goal','save','miss','blocked_shot','seven_meter_shot')
 and not exists(select 1 from public.shot_attempts s where s.event_id=e.id);

create table public.on_court_intervals (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade, match_id uuid not null references public.matches(id) on delete cascade,
 team_id uuid not null references public.teams(id), player_id uuid not null references public.players(id),
 position public.player_position not null, period smallint not null check(period between 1 and 4),
 start_clock_ms bigint not null check(start_clock_ms>=0),end_clock_ms bigint, verified boolean not null default false,
 check(end_clock_ms is null or end_clock_ms>start_clock_ms),
 exclude using gist(analysis_session_id with =,player_id with =,period with =,int8range(start_clock_ms,end_clock_ms,'[)') with &&)
);
create table public.substitutions (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade, match_id uuid not null references public.matches(id) on delete cascade,
 team_id uuid not null references public.teams(id),out_player_id uuid references public.players(id),in_player_id uuid references public.players(id),
 period smallint not null check(period between 1 and 4),clock_ms bigint not null check(clock_ms>=0),video_ms bigint not null check(video_ms>=0),
 position public.player_position not null, check(out_player_id is not null or in_player_id is not null),check(out_player_id is distinct from in_player_id)
);

create table public.tactic_documents (
 id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
 title text not null,description text,team_id uuid references public.teams(id), match_id uuid references public.matches(id),
 created_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create table public.tactic_frames (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 document_id uuid not null references public.tactic_documents(id) on delete cascade,position integer not null check(position>=0),title text,
 unique(document_id,position)
);
create table public.tactic_objects (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 document_id uuid not null references public.tactic_documents(id) on delete cascade,
 kind text not null check(kind in ('player','ball','arrow','path','zone','text')),label text,color text not null default '#25d9f5'
);
create table public.tactic_frame_objects (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 frame_id uuid not null references public.tactic_frames(id) on delete cascade,object_id uuid not null references public.tactic_objects(id) on delete cascade,
 x numeric not null check(x between 0 and 1), y numeric not null check(y between 0 and 1),
 geometry jsonb not null default '{}' check(jsonb_typeof(geometry)='object'),visible boolean not null default true,unique(frame_id,object_id)
);
create table public.tactic_animations (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 from_frame_id uuid not null references public.tactic_frames(id) on delete cascade,to_frame_id uuid not null references public.tactic_frames(id) on delete cascade,
 duration_ms integer not null default 1000 check(duration_ms between 100 and 30000),easing text not null default 'linear' check(easing in ('linear','ease_in_out')),
 unique(from_frame_id,to_frame_id),check(from_frame_id<>to_frame_id)
);
create table public.video_annotations (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 video_id uuid not null references public.videos(id) on delete cascade,analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
 start_ms bigint not null check(start_ms>=0),end_ms bigint not null, pause_on_entry boolean not null default false,
 objects jsonb not null default '[]' check(jsonb_typeof(objects)='array'),check(end_ms>start_ms)
);
create table public.evidence_links (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 insight_id uuid references public.insights(id) on delete cascade,event_id uuid references public.events(id) on delete cascade,
 shot_id uuid references public.shot_attempts(id) on delete cascade,clip_id uuid references public.clips(id) on delete cascade,
 tactic_id uuid references public.tactic_documents(id) on delete cascade,note text,
 check(num_nonnulls(insight_id,event_id,shot_id,clip_id,tactic_id)>=2)
);
create table public.presentations (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 title text not null,created_by uuid not null references auth.users(id),created_at timestamptz not null default now()
);
create table public.presentation_items (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 presentation_id uuid not null references public.presentations(id) on delete cascade,position integer not null check(position>=0),
 clip_id uuid references public.clips(id),tactic_id uuid references public.tactic_documents(id),insight_id uuid references public.insights(id),
 body text,speaker_note text,autoplay boolean not null default false,
 check(num_nonnulls(clip_id,tactic_id,insight_id,body)=1),unique(presentation_id,position)
);
create table public.tagging_templates (
 id uuid primary key default gen_random_uuid(),organization_id uuid not null references public.organizations(id) on delete cascade,
 title text not null,buttons jsonb not null check(jsonb_typeof(buttons)='array')
);
create table public.metric_definitions (
 code text primary key,label_ar text not null,label_en text not null,unit text not null,
 positions public.player_position[] not null,formula text not null
);
insert into public.metric_definitions values
 ('shot_efficiency','كفاءة التصويب','Shot efficiency','percent',array['LW','LB','CB','RB','RW','P']::public.player_position[],'goals / reviewed_attempts'),
 ('save_percentage','نسبة التصدي','Save percentage','percent',array['GK']::public.player_position[],'saves / (saves + goals_faced); excludes empty goal'),
 ('assists','تمريرات حاسمة','Assists','count',array['CB','LB','RB']::public.player_position[],'distinct assist events'),
 ('wing_efficiency','كفاءة الجناح','Wing efficiency','percent',array['LW','RW']::public.player_position[],'wing goals / reviewed wing attempts'),
 ('pivot_efficiency','كفاءة الدائرة','Pivot efficiency','percent',array['P']::public.player_position[],'pivot goals / reviewed pivot attempts'),
 ('nine_meter_efficiency','كفاءة ٩م','9m efficiency','percent',array['LB','CB','RB']::public.player_position[],'9m goals / reviewed 9m attempts'),
 ('minutes','دقائق اللعب','On-court minutes','minutes',array['GK','LW','LB','CB','RB','RW','P']::public.player_position[],'sum closed verified intervals / 60000');
