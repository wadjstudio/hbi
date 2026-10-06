// Test-only Auth/Data API fixture. It is never part of the deployed application.
import http from "node:http";
import { createHmac, randomUUID } from "node:crypto";
const id = "10000000-0000-4000-8000-000000000001",
  org = "20000000-0000-4000-8000-000000000001",
  home = "30000000-0000-4000-8000-000000000001",
  away = "30000000-0000-4000-8000-000000000002",
  match = "50000000-0000-4000-8000-000000000001";
const user = {
  id,
  email: "coach@example.test",
  aud: "authenticated",
  role: "authenticated",
  app_metadata: { provider: "email" },
  user_metadata: {},
  created_at: new Date().toISOString(),
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const payload = b64({
  sub: id,
  aud: "authenticated",
  role: "authenticated",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
});
const unsigned = `${b64({ alg: "HS256", typ: "JWT" })}.${payload}`;
const token = `${unsigned}.${createHmac("sha256", "test-only-secret").update(unsigned).digest("base64url")}`;
const organization = {
  id: org,
  name: "HBI Test Club",
  slug: "test",
  organization_id: org,
};
const db = {
  organization_members: [
    {
      organization_id: org,
      user_id: id,
      role: "owner",
      organizations: organization,
    },
  ],
  teams: [
    {
      id: home,
      organization_id: org,
      name: "Home",
      is_own_team: true,
      revision: 1,
    },
    {
      id: away,
      organization_id: org,
      name: "Away",
      is_own_team: false,
      revision: 1,
    },
  ],
  matches: [
    {
      id: match,
      organization_id: org,
      home_team_id: home,
      away_team_id: away,
      status: "ready",
      revision: 1,
    },
  ],
  players: [],
  tactical_terms: [],
};
const receipts = new Map();
// Deterministic test roster/taxonomy; production always reads PostgreSQL data.
const field = "40000000-0000-4000-8000-000000000001",
  keeper = "40000000-0000-4000-8000-000000000002";
db.players = [
  {
    id: field,
    organization_id: org,
    first_name: "Match",
    last_name: "Playmaker",
    primary_position: "CB",
    revision: 1,
  },
  {
    id: keeper,
    organization_id: org,
    first_name: "Match",
    last_name: "Keeper",
    primary_position: "GK",
    revision: 1,
  },
];
db.match_roster = [
  {
    id: randomUUID(),
    organization_id: org,
    match_id: match,
    team_id: home,
    player_id: field,
    side: "home",
    starting: true,
    revision: 1,
  },
  {
    id: randomUUID(),
    organization_id: org,
    match_id: match,
    team_id: away,
    player_id: keeper,
    side: "away",
    starting: true,
    revision: 1,
  },
];
db.tactical_terms = [
  {
    id: "90000000-0000-4000-8000-000000000001",
    organization_id: null,
    code: "cross",
    category: "attack_action",
    label_ar: "تقاطع",
    label_en: "Cross",
    archived: false,
  },
];
const baseline = structuredClone(db);
const server = http.createServer(async (req, res) => {
  res.setHeader(
    "Access-Control-Allow-Origin",
    process.env.HBI_E2E_ORIGIN || "http://127.0.0.1:3000",
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    req.headers["access-control-request-headers"] ??
      "authorization,apikey,content-type,x-client-info,prefer,range,x-supabase-api-version,accept-profile,content-profile",
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  let body = "";
  for await (const chunk of req) body += chunk;
  const input = body ? JSON.parse(body) : {};
  const url = new URL(req.url, "http://localhost");
  const send = (value) => res.end(JSON.stringify(value));
  if (url.pathname === "/test/reset" && req.method === "POST") {
    for (const key of Object.keys(db)) delete db[key];
    Object.assign(db, structuredClone(baseline));
    receipts.clear();
    return send({ reset: true });
  }
  if (url.pathname === "/auth/v1/token") {
    return send({
      access_token: token,
      refresh_token: "test-refresh",
      token_type: "bearer",
      expires_in: 3600,
      user,
    });
  }
  if (url.pathname === "/auth/v1/user") return send(user);
  if (url.pathname === "/auth/v1/logout") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (url.pathname === "/rest/v1/rpc/apply_workspace_change") {
    if (receipts.has(input.p_operation_id))
      return send(receipts.get(input.p_operation_id));
    const rows = (db[input.p_table] ??= []),
      old = rows.find((r) => r.id === input.p_row.id);
    if ((old?.revision ?? 0) !== input.p_expected_revision)
      return send({
        status: "conflict",
        server: old ?? null,
        local: input.p_row,
      });
    if (input.p_delete) {
      db[input.p_table] = rows.filter((r) => r.id !== input.p_row.id);
      const result = {
        status: "applied",
        row: { id: input.p_row.id, deleted: true },
      };
      receipts.set(input.p_operation_id, result);
      return send(result);
    }
    const row = { ...old, ...input.p_row, revision: (old?.revision ?? 0) + 1 };
    db[input.p_table] = [...rows.filter((r) => r.id !== row.id), row];
    const result = { status: "applied", row };
    receipts.set(input.p_operation_id, result);
    return send(result);
  }
  if (url.pathname.startsWith("/rest/v1/")) {
    const table = url.pathname.split("/").at(-1);
    if (req.method === "POST") {
      const row = { id: randomUUID(), revision: 1, ...input };
      (db[table] ??= []).push(row);
      return send([row]);
    }
    return send(db[table] ?? []);
  }
  send({ ok: true });
});
server.listen(Number(process.env.HBI_MOCK_PORT || 54329), "127.0.0.1", () =>
  console.log("Test Auth/Data fixture ready"),
);
