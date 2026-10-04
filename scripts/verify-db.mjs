import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
process.on("uncaughtException", (e) => {
  console.error(e.message, e.where ?? "");
  process.exit(1);
});
let PGlite, btree_gist;
try {
  ({ PGlite } = await import("@electric-sql/pglite"));
  ({ btree_gist } = await import("@electric-sql/pglite/contrib/btree_gist"));
} catch {
  ({ PGlite } =
    await import("../../sql-runner/node_modules/@electric-sql/pglite/dist/index.js"));
  ({ btree_gist } =
    await import("../../sql-runner/node_modules/@electric-sql/pglite/dist/contrib/btree_gist.js"));
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ids = {
  user: "10000000-0000-4000-8000-000000000001",
  viewer: "10000000-0000-4000-8000-000000000002",
  other: "10000000-0000-4000-8000-000000000003",
  org: "20000000-0000-4000-8000-000000000001",
  org2: "20000000-0000-4000-8000-000000000002",
  home: "30000000-0000-4000-8000-000000000001",
  away: "30000000-0000-4000-8000-000000000002",
  outsider: "30000000-0000-4000-8000-000000000003",
  player: "40000000-0000-4000-8000-000000000001",
  keeper: "40000000-0000-4000-8000-000000000002",
  match: "50000000-0000-4000-8000-000000000001",
  video: "60000000-0000-4000-8000-000000000001",
  session: "70000000-0000-4000-8000-000000000001",
  event: "80000000-0000-4000-8000-000000000001",
};
async function initialize() {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(
    `create role authenticated;create role anon;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema public,auth to authenticated,anon;grant execute on function auth.uid() to authenticated,anon;`,
  );
  return db;
}
const migrations = (await readdir(resolve(root, "supabase/migrations")))
  .filter((n) => n.endsWith(".sql"))
  .sort();
async function migrate(db, names) {
  for (const name of names) {
    let sql = await readFile(
      resolve(root, "supabase/migrations", name),
      "utf8",
    );
    sql = sql.replace(
      /create extension if not exists pgcrypto;/gi,
      "-- gen_random_uuid is native; pgcrypto extension not loaded in WASM harness",
    );
    try {
      await db.exec(sql);
    } catch (e) {
      console.error("MIGRATION FAILED", name, e.message);
      throw e;
    }
  }
}
async function fixture(db) {
  await db.exec(`insert into auth.users(id,email) values('${ids.user}','analyst@example.test'),('${ids.viewer}','viewer@example.test'),('${ids.other}','other@example.test');
insert into public.organizations(id,name,slug,created_by) values('${ids.org}','A','a','${ids.user}'),('${ids.org2}','B','b','${ids.other}');
insert into public.organization_members values('${ids.org}','${ids.user}','analyst',now()),('${ids.org}','${ids.viewer}','viewer',now()),('${ids.org2}','${ids.other}','owner',now());
insert into public.teams(id,organization_id,name) values('${ids.home}','${ids.org}','Home'),('${ids.away}','${ids.org}','Away'),('${ids.outsider}','${ids.org2}','Outside');
insert into public.players(id,organization_id,first_name,last_name,primary_position) values('${ids.player}','${ids.org}','Field','Player','CB'),('${ids.keeper}','${ids.org}','Goal','Keeper','GK');
insert into public.matches(id,organization_id,home_team_id,away_team_id,created_by) values('${ids.match}','${ids.org}','${ids.home}','${ids.away}','${ids.user}');
insert into public.match_roster(match_id,player_id,team_id,side) values('${ids.match}','${ids.player}','${ids.home}','home'),('${ids.match}','${ids.keeper}','${ids.away}','away');
insert into public.videos(id,organization_id,match_id,storage_mode,local_fingerprint,duration_ms,created_by) values('${ids.video}','${ids.org}','${ids.match}','local','fixture',3600000,'${ids.user}');
insert into public.analysis_sessions(id,organization_id,match_id,video_id,analyst_id) values('${ids.session}','${ids.org}','${ids.match}','${ids.video}','${ids.user}');
insert into public.events(id,organization_id,analysis_session_id,match_id,team_id,actor_player_id,timestamp_ms,period,event_type,created_by) values('${ids.event}','${ids.org}','${ids.session}','${ids.match}','${ids.home}','${ids.player}',1000,1,'goal','${ids.user}');`);
}
async function asUser(db, id) {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
async function denied(db, sql) {
  await assert.rejects(db.exec(sql));
}
const db = await initialize();
await migrate(db, migrations.slice(0, 10));
await fixture(db);
await migrate(db, migrations.slice(10));
console.log("PASS: upgrade from original ten migrations with legacy data");
assert.equal(
  (await db.query("select count(*)::int n from events")).rows[0].n,
  1,
);
assert.equal(
  (await db.query("select count(*)::int n from shot_attempts")).rows[0].n,
  1,
);
await db.exec(`grant select on public.organizations to authenticated;`);
await asUser(db, ids.other);
assert.equal((await db.query("select * from public.matches")).rows.length, 0);
assert.equal(
  (await db.query("select * from public.v_shot_metrics")).rows.length,
  0,
);
console.log("PASS: organization isolation in tables and analytics views");
await asUser(db, ids.viewer);
await denied(
  db,
  `insert into public.events(organization_id,analysis_session_id,match_id,team_id,timestamp_ms,period,event_type,created_by)values('${ids.org}','${ids.session}','${ids.match}','${ids.home}',2000,1,'turnover','${ids.viewer}')`,
);
console.log("PASS: viewer cannot write");
await asUser(db, ids.user);
assert.equal(
  (
    await db.query(
      `delete from public.matches where id='${ids.match}' returning id`,
    )
  ).rows.length,
  0,
);
console.log("PASS: analyst cannot delete match");
await denied(
  db,
  `update public.events set organization_id='${ids.org2}' where id='${ids.event}'`,
);
await denied(
  db,
  `insert into public.clips(organization_id,video_id,match_id,title,start_ms,end_ms,created_by) values('${ids.org2}','${ids.video}','${ids.match}','bad',0,100,'${ids.user}')`,
);
console.log("PASS: cross-scope writes denied");
const participant = {
  id: crypto.randomUUID(),
  organization_id: ids.org,
  event_id: ids.event,
  player_id: ids.player,
  role: "assister",
};
const participantOperation = crypto.randomUUID();
const participantArgs = [
  "event_participants",
  JSON.stringify(participant),
  0,
  participantOperation,
];
const participantFirst = (
  await db.query(
    "select apply_workspace_change($1,$2::jsonb,$3,$4) result",
    participantArgs,
  )
).rows[0].result;
const participantRetry = (
  await db.query(
    "select apply_workspace_change($1,$2::jsonb,$3,$4) result",
    participantArgs,
  )
).rows[0].result;
assert.deepEqual(participantRetry, participantFirst);
const unrostered = crypto.randomUUID();
await db.exec(
  `insert into players(id,organization_id,first_name,last_name)values('${unrostered}','${ids.org}','Not','Rostered')`,
);
await denied(
  db,
  `insert into event_participants(organization_id,event_id,player_id,role)values('${ids.org}','${ids.event}','${unrostered}','defender')`,
);
await denied(db, `update events set score_for=-1 where id='${ids.event}'`);
await denied(
  db,
  `update events set actor_player_id='${unrostered}' where id='${ids.event}'`,
);
console.log(
  "PASS: roster-validated participants, idempotent participant sync and score constraints",
);
await db.exec(
  `update public.shot_attempts set result='save',goalkeeper_id='${ids.keeper}',review_required=false where event_id='${ids.event}'`,
);
const metrics = (
  await db.query(`select public.get_team_attack_summary('${ids.home}') summary`)
).rows[0].summary;
assert.equal(metrics.shots, 1);
assert.equal(metrics.goals, 0);
console.log("PASS: canonical shot counted once");
await db.exec(
  `insert into public.video_clock_segments(organization_id,analysis_session_id,period,video_start_ms,video_end_ms,clock_start_ms) values('${ids.org}','${ids.session}',1,0,2000,0)`,
);
await denied(
  db,
  `insert into public.video_clock_segments(organization_id,analysis_session_id,period,video_start_ms,video_end_ms,clock_start_ms) values('${ids.org}','${ids.session}',1,1000,3000,0)`,
);
console.log("PASS: clock segment overlap prevented");
await db.exec(
  `insert into public.on_court_intervals(organization_id,analysis_session_id,match_id,team_id,player_id,position,period,start_clock_ms) values('${ids.org}','${ids.session}','${ids.match}','${ids.home}','${ids.player}','CB',1,0)`,
);
await denied(
  db,
  `insert into public.on_court_intervals(organization_id,analysis_session_id,match_id,team_id,player_id,position,period,start_clock_ms) values('${ids.org}','${ids.session}','${ids.match}','${ids.home}','${ids.player}','CB',1,100)`,
);
const sub = {
  id: crypto.randomUUID(),
  organization_id: ids.org,
  analysis_session_id: ids.session,
  match_id: ids.match,
  team_id: ids.home,
  out_player_id: ids.player,
  in_player_id: null,
  position: "CB",
  period: 1,
  clock_ms: 5000,
  video_ms: 6000,
};
await db.query("select record_substitution($1::jsonb)", [JSON.stringify(sub)]);
assert.equal(
  (await db.query("select end_clock_ms from on_court_intervals")).rows[0]
    .end_clock_ms,
  5000,
);
await db.query("select record_substitution($1::jsonb)", [JSON.stringify(sub)]);
assert.equal(
  (await db.query("select count(*)::int n from substitutions")).rows[0].n,
  1,
);
console.log("PASS: atomic substitution and retry");
const row = {
    id: crypto.randomUUID(),
    organization_id: ids.org,
    title: "Tactic",
    created_by: ids.user,
  },
  op = crypto.randomUUID();
const write = () =>
  db.query("select apply_workspace_change($1,$2::jsonb,$3,$4) result", [
    "tactic_documents",
    JSON.stringify(row),
    0,
    op,
  ]);
assert.equal((await write()).rows[0].result.status, "applied");
assert.equal((await write()).rows[0].result.status, "applied");
const conflict = await db.query(
  "select apply_workspace_change($1,$2::jsonb,$3,$4) result",
  [
    "tactic_documents",
    JSON.stringify({ ...row, title: "Changed" }),
    0,
    crypto.randomUUID(),
  ],
);
assert.equal(conflict.rows[0].result.status, "conflict");
console.log("PASS: sync CAS and idempotency");

// References within the same organization still must agree on match/session/document.
const secondMatch = crypto.randomUUID(),
  secondSession = crypto.randomUUID();
await db.exec(
  `insert into matches(id,organization_id,home_team_id,away_team_id,created_by)values('${secondMatch}','${ids.org}','${ids.home}','${ids.away}','${ids.user}');insert into analysis_sessions(id,organization_id,match_id,analyst_id)values('${secondSession}','${ids.org}','${secondMatch}','${ids.user}')`,
);
await denied(
  db,
  `insert into events(organization_id,analysis_session_id,match_id,team_id,timestamp_ms,period,event_type,created_by)values('${ids.org}','${secondSession}','${ids.match}','${ids.home}',0,1,'turnover','${ids.user}')`,
);
const foreignClip = crypto.randomUUID();
await db.exec(
  `insert into clips(id,organization_id,video_id,match_id,title,start_ms,end_ms,created_by)values('${foreignClip}','${ids.org}','${ids.video}','${ids.match}','sample',0,100,'${ids.user}')`,
);
await denied(
  db,
  `insert into evidence_links(organization_id,event_id,clip_id)select '${ids.org}',id,'${foreignClip}' from events where match_id='${secondMatch}' union all select '${ids.org}','${ids.event}',gen_random_uuid()`,
);
await denied(
  db,
  `insert into shot_attempts(organization_id,event_id,result)values('${ids.org}','${ids.event}','goal')`,
);
await denied(
  db,
  `update shot_attempts set empty_goal=true where event_id='${ids.event}'`,
);
const closed = (await db.query("select end_clock_ms from on_court_intervals"))
  .rows[0].end_clock_ms;
await assert.rejects(
  db.query("select record_substitution($1::jsonb)", [
    JSON.stringify({
      ...sub,
      id: crypto.randomUUID(),
      out_player_id: ids.player,
      clock_ms: 6000,
    }),
  ]),
);
assert.equal(
  (await db.query("select end_clock_ms from on_court_intervals")).rows[0]
    .end_clock_ms,
  closed,
);
assert.equal(
  (
    await db.query(
      `update tactical_terms set label_en='changed global' where organization_id is null returning id`,
    )
  ).rows.length,
  0,
);
console.log(
  "PASS: same-org session integrity, unique shot, empty goal validation and substitution rollback",
);

const possession = crypto.randomUUID();
await db.exec(`insert into possessions(id,organization_id,analysis_session_id,match_id,team_id,sequence_no,start_ms,end_ms,period,phase)values('${possession}','${ids.org}','${ids.session}','${ids.match}','${ids.home}',1,0,5000,1,'positional_attack');
insert into possession_tactics(organization_id,possession_id,term_id)select '${ids.org}','${possession}',id from tactical_terms where category='defense_system' and organization_id is null order by code limit 1`);
const defense = (
  await db.query("select * from get_tactical_distribution($1)", [ids.away])
).rows;
assert.equal(defense.length, 1);
assert.equal(defense[0].possessions, 1);
assert.equal(
  (await db.query("select * from get_tactical_distribution($1)", [ids.home]))
    .rows.length,
  0,
);
await asUser(db, ids.other);
assert.equal(
  (await db.query("select * from v_tactical_observations")).rows.length,
  0,
);
await asUser(db, ids.user);
const alternate = crypto.randomUUID(),
  alternateEvent = crypto.randomUUID();
await db.exec(`insert into analysis_sessions(id,organization_id,match_id,analyst_id,is_primary)values('${alternate}','${ids.org}','${ids.match}','${ids.user}',false);
insert into events(id,organization_id,analysis_session_id,match_id,team_id,timestamp_ms,period,event_type,created_by)values('${alternateEvent}','${ids.org}','${alternate}','${ids.match}','${ids.home}',7000,1,'shot','${ids.user}');
insert into shot_attempts(organization_id,event_id,result)values('${ids.org}','${alternateEvent}','goal')`);
await denied(
  db,
  `insert into evidence_links(organization_id,event_id,shot_id)select '${ids.org}','${ids.event}',id from shot_attempts where event_id='${alternateEvent}'`,
);
assert.equal(
  (await db.query("select get_team_attack_summary($1) summary", [ids.home]))
    .rows[0].summary.shots,
  1,
);
await denied(
  db,
  `update analysis_sessions set is_primary=true where id='${alternate}'`,
);
console.log(
  "PASS: defensive taxonomy attribution, invoker isolation and primary-only aggregates",
);
await db.exec(
  `reset role;update organization_members set role='head_coach' where user_id='${ids.user}' and organization_id='${ids.org}'`,
);
await asUser(db, ids.user);
await db.exec(
  `insert into teams(organization_id,name)values('${ids.org}','Coach team')`,
);
await denied(
  db,
  `insert into seasons(organization_id,name)values('${ids.org}','Coach season')`,
);
assert.equal(
  (await db.query(`delete from matches where id='${secondMatch}' returning id`))
    .rows.length,
  1,
);
await db.exec(
  `reset role;update organization_members set role='technical_director' where user_id='${ids.user}' and organization_id='${ids.org}'`,
);
await asUser(db, ids.user);
await db.exec(
  `insert into seasons(organization_id,name)values('${ids.org}','Director season')`,
);
console.log(
  "PASS: head-coach team/match permissions and director-only seasons",
);
await db.exec("reset role;");
const fresh = await initialize();
await migrate(fresh, migrations);
console.log("PASS: clean installation");
if (process.argv.includes("--types")) {
  const { generateTypes } = await import("./catalog-types.mjs");
  await writeFile(
    resolve(root, "lib/supabase/database.types.ts"),
    await generateTypes(db),
  );
  console.log("Generated catalog types including RPCs and relationships");
}
await db.close();
await fresh.close();
