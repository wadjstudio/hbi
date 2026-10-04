"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { substitutionInput, syncResponse } from "@/features/analysis/contracts";
import { parseWorkspaceBackup } from "./backup";
import { releaseLocalSources } from "@/lib/video/local-sources";
import { canWrite } from "@/lib/permissions/roles";
import { createClient } from "@/lib/supabase/client";
import { localDB, recordKey, type Operation } from "@/lib/local/database";
import {
  tables,
  validateRow,
  n,
  s,
  type Row,
  type Rows,
  type Table,
} from "@/types/workspace";
type Context = {
  rows: Rows;
  org: string;
  user: string;
  role: string;
  orgs: Row[];
  lang: "ar" | "en";
  ready: boolean;
  online: boolean;
  error: string;
  pending: Operation[];
  source: string;
  t: (ar: string, en: string) => string;
  list: (table: Table) => Row[];
  save: (table: Table, row: Partial<Row>, remove?: boolean) => Promise<Row>;
  direct: (table: Table, row: Record<string, unknown>) => Promise<void>;
  substitute: (row: Row) => Promise<void>;
  selectOrg: (org: string) => void;
  setLang: (lang: "ar" | "en") => void;
  reload: () => Promise<void>;
  flush: () => Promise<void>;
  resolve: (id: string, choice: "server" | "local") => Promise<void>;
  backup: () => Promise<void>;
  restore: (file: File) => Promise<void>;
  createOrg: (name: string, slug: string) => Promise<void>;
  logout: () => Promise<void>;
};
const WorkspaceContext = createContext<Context | null>(null);
export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("Workspace provider missing");
  return value;
}
let order = 0;
export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [rows, setRows] = useState<Rows>({}),
    [org, setOrg] = useState(""),
    [user, setUser] = useState(""),
    [role, setRole] = useState("viewer"),
    [orgs, setOrgs] = useState<Row[]>([]);
  const [lang, setLang] = useState<"ar" | "en">("ar"),
    [ready, setReady] = useState(false),
    [online, setOnline] = useState(true),
    [error, setError] = useState(""),
    [pending, setPending] = useState<Operation[]>([]),
    [source, setSource] = useState("");
  const client = useRef<ReturnType<typeof createClient> | null>(null),
    busy = useRef(false),
    refreshNeeded = useRef(false),
    languageLoaded = useRef(false),
    identity = useRef(""),
    rowsRef = useRef(rows);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  const scope = user && org ? `${user}:${org}` : "";
  useEffect(() => () => releaseLocalSources(scope), [scope]);
  const readLocal = useCallback(async () => {
    if (!scope) return;
    const records = await localDB.records
      .where("scope")
      .equals(scope)
      .toArray();
    const next: Rows = {};
    for (const r of records) (next[r.table] ??= []).push(r.row);
    if (identity.current === scope) {
      rowsRef.current = next;
      setRows(next);
      setPending(
        await localDB.operations
          .where("scope")
          .equals(scope)
          .sortBy("queuedAt"),
      );
    }
  }, [scope]);
  const reload = useCallback(async () => {
    const c = client.current;
    if (!c || !scope) return;
    try {
      await readLocal();
      setSource("local");
      if (!navigator.onLine) return;
      const ops = await localDB.operations
        .where("scope")
        .equals(scope)
        .toArray();
      const dirty = new Set(ops.map((o) => `${o.table}:${o.row.id}`));
      const results = await Promise.all(
        tables.map(async (table) => {
          const items: Row[] = [];
          for (let offset = 0; ; offset += 500) {
            let query = c.from(table).select("*");
            query =
              table === "tactical_terms"
                ? query.or(`organization_id.is.null,organization_id.eq.${org}`)
                : query.eq("organization_id", org);
            const { data, error: e } = await query
              .order("id")
              .range(offset, offset + 499);
            if (e) throw new Error(`${table}: ${e.message}`);
            items.push(...(data as Row[]));
            if (data.length < 500) break;
          }
          return { table, items };
        }),
      );
      if (identity.current !== scope) return;
      await localDB.transaction(
        "rw",
        localDB.records,
        localDB.operations,
        async () => {
          const latest = await localDB.operations
            .where("scope")
            .equals(scope)
            .toArray();
          for (const op of latest) dirty.add(`${op.table}:${op.row.id}`);
          for (const { table, items } of results) {
            const existing = await localDB.records
              .where("[scope+table]")
              .equals([scope, table])
              .toArray();
            const ids = new Set(items.map((r) => r.id));
            for (const r of existing)
              if (!ids.has(r.row.id) && !dirty.has(`${table}:${r.row.id}`))
                await localDB.records.delete(r.key);
            for (const row of items)
              if (!dirty.has(`${table}:${row.id}`))
                await localDB.records.put({
                  key: recordKey(scope, table, row.id),
                  scope,
                  table,
                  row,
                });
          }
        },
      );
      await readLocal();
      setSource("server");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (identity.current === scope) setReady(true);
    }
  }, [scope, org, readLocal]);
  const flush = useCallback(async () => {
    const c = client.current;
    if (!c || !scope || busy.current || !navigator.onLine) return;
    busy.current = true;
    try {
      const ops = await localDB.operations
        .where("scope")
        .equals(scope)
        .sortBy("queuedAt");
      for (const op of ops) {
        if (identity.current !== scope) break;
        if (op.error) break;
        const { data, error: e } = op.rpc
          ? await c.rpc(op.rpc, { p_row: op.row })
          : await c.rpc("apply_workspace_change", {
              p_table: op.table,
              p_row: op.row,
              p_expected_revision: op.expected,
              p_operation_id: op.id,
              p_delete: op.remove,
            });
        if (identity.current !== scope) break;
        if (e) {
          await localDB.operations.update(op.id, { error: e.message });
          setError(e.message);
          break;
        }
        const reply = syncResponse.parse(data);
        if (reply.status === "conflict") {
          await localDB.operations.update(op.id, {
            error: "conflict",
            conflict: reply.server as Row | null,
          });
          break;
        }
        if (op.rpc || op.remove) refreshNeeded.current = true;
        await localDB.operations.delete(op.id);
        const remains = await localDB.operations
          .where("scope")
          .equals(scope)
          .filter((o) => o.table === op.table && o.row.id === op.row.id)
          .count();
        if (!remains && !op.remove && reply.row)
          await localDB.records.put({
            key: recordKey(scope, op.table, op.row.id),
            scope,
            table: op.table,
            row: reply.row as Row,
          });
      }
      await readLocal();
      if (
        refreshNeeded.current &&
        (await localDB.operations.where("scope").equals(scope).count()) === 0
      ) {
        refreshNeeded.current = false;
        await reload();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      busy.current = false;
    }
  }, [scope, readLocal, reload]);
  useEffect(() => {
    client.current = createClient();
    const savedLanguage =
      localStorage.getItem("hbi-lang") === "en" ? "en" : "ar";
    queueMicrotask(() => {
      languageLoaded.current = true;
      setLang(savedLanguage);
    });
    const c = client.current;
    void c.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUser(data.user.id);
      const { data: members, error: e } = await c
        .from("organization_members")
        .select("role,organization_id,organizations(*)")
        .eq("user_id", data.user.id);
      if (e) {
        setError(e.message);
        return;
      }
      const choices = (members ?? []).map((m) => ({
        ...m.organizations,
        role: m.role,
      })) as unknown as Row[];
      setOrgs(choices);
      const saved = localStorage.getItem(`hbi-org:${data.user.id}`);
      const selected = choices.find((o) => o.id === saved) ?? choices[0];
      if (selected) {
        setOrg(selected.id);
        setRole(s(selected.role));
      } else setReady(true);
    });
    const { data: listener } = c.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        identity.current = "";
        rowsRef.current = {};
        setRows({});
        setPending([]);
        setUser("");
        setOrg("");
        router.replace("/login");
      }
    });
    const net = () => setOnline(navigator.onLine);
    net();
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    return () => {
      listener.subscription.unsubscribe();
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
    };
  }, [router]);
  useEffect(() => {
    identity.current = scope;
    refreshNeeded.current = false;
    rowsRef.current = {};
    queueMicrotask(() => {
      setRows({});
      setPending([]);
      setReady(false);
      if (scope) {
        localStorage.setItem(`hbi-org:${user}`, org);
        void reload();
      }
    });
  }, [scope, org, user, reload]);
  useEffect(() => {
    if (online && ready) {
      void flush();
      const timer = setInterval(() => void flush(), 5000);
      return () => clearInterval(timer);
    }
  }, [online, ready, flush]);
  useEffect(() => {
    if (!languageLoaded.current) return;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    localStorage.setItem("hbi-lang", lang);
  }, [lang]);
  async function save(
    table: Table,
    input: Partial<Row>,
    remove = false,
  ): Promise<Row> {
    if (!scope || identity.current !== scope)
      throw new Error("Choose an organization");
    if (!canWrite(role, table))
      throw new Error("This role cannot edit this collection");
    const id = input.id ?? crypto.randomUUID();
    const current = rowsRef.current[table]?.find((r) => r.id === id);
    const expected = n(input.revision ?? current?.revision);
    const row = validateRow(table, {
      ...current,
      ...input,
      id,
      organization_id: org,
      revision: expected + 1,
    });
    if (
      !current &&
      [
        "matches",
        "videos",
        "clips",
        "playlists",
        "reports",
        "tactic_documents",
        "presentations",
        "events",
      ].includes(table)
    )
      row.created_by = user;
    if (table === "analysis_sessions" && !current) row.analyst_id = user;
    const op: Operation = {
      id: crypto.randomUUID(),
      queuedAt: Date.now() + (++order % 1000) / 1000,
      scope,
      table,
      row,
      expected,
      remove,
    };
    await localDB.transaction(
      "rw",
      localDB.records,
      localDB.operations,
      async () => {
        await localDB.operations.add(op);
        if (remove) await localDB.records.delete(recordKey(scope, table, id));
        else
          await localDB.records.put({
            key: recordKey(scope, table, id),
            scope,
            table,
            row,
          });
      },
    );
    await readLocal();
    void flush();
    return row;
  }
  async function direct(table: Table, row: Record<string, unknown>) {
    const c = client.current;
    if (!c) throw new Error("Not initialized");
    if (!navigator.onLine) throw new Error("Setup needs a connection");
    const { error: e } = await c
      .from(table)
      .upsert({ ...row, organization_id: org });
    if (e) throw new Error(e.message);
    await reload();
  }
  async function substitute(row: Row) {
    substitutionInput.parse(row);
    if (!canWrite(role, "substitutions"))
      throw new Error("This role cannot substitute players");
    const intervals = rowsRef.current.on_court_intervals ?? [];
    const outgoing = intervals.find(
      (r) =>
        r.analysis_session_id === row.analysis_session_id &&
        r.team_id === row.team_id &&
        r.player_id === row.out_player_id &&
        r.period === row.period &&
        r.end_clock_ms == null,
    );
    if (
      row.out_player_id &&
      (!outgoing || n(outgoing.start_clock_ms) >= n(row.clock_ms))
    )
      throw new Error("Outgoing player has no valid open interval");
    await localDB.transaction(
      "rw",
      localDB.records,
      localDB.operations,
      async () => {
        await localDB.operations.add({
          id: crypto.randomUUID(),
          queuedAt: Date.now() + (++order % 1000) / 1000,
          scope,
          table: "substitutions",
          row,
          expected: 0,
          remove: false,
          rpc: "record_substitution",
        });
        await localDB.records.put({
          key: recordKey(scope, "substitutions", row.id),
          scope,
          table: "substitutions",
          row,
        });
        if (row.in_player_id) {
          const incoming = {
            id: row.id,
            organization_id: org,
            analysis_session_id: row.analysis_session_id,
            match_id: row.match_id,
            team_id: row.team_id,
            player_id: row.in_player_id,
            position: row.position,
            period: row.period,
            start_clock_ms: row.clock_ms,
            end_clock_ms: null,
            verified: true,
            revision: 1,
          } as Row;
          await localDB.records.put({
            key: recordKey(scope, "on_court_intervals", incoming.id),
            scope,
            table: "on_court_intervals",
            row: incoming,
          });
        }
        if (outgoing)
          await localDB.records.put({
            key: recordKey(scope, "on_court_intervals", outgoing.id),
            scope,
            table: "on_court_intervals",
            row: {
              ...outgoing,
              end_clock_ms: row.clock_ms,
              revision: n(outgoing.revision) + 1,
            },
          });
      },
    );
    await readLocal();
    void flush();
  }
  async function resolve(id: string, choice: "server" | "local") {
    const op = await localDB.operations.get(id);
    if (!op || op.scope !== scope) return;
    const related = await localDB.operations
      .where("scope")
      .equals(scope)
      .filter((o) => o.table === op.table && o.row.id === op.row.id)
      .toArray();
    if (choice === "server") {
      await localDB.operations.bulkDelete(related.map((o) => o.id));
      if (op.conflict)
        await localDB.records.put({
          key: recordKey(scope, op.table, op.row.id),
          scope,
          table: op.table,
          row: op.conflict,
        });
      else await localDB.records.delete(recordKey(scope, op.table, op.row.id));
    } else {
      const latest = await localDB.records.get(
        recordKey(scope, op.table, op.row.id),
      );
      const expected =
        op.error === "conflict" ? n(op.conflict?.revision) : op.expected;
      const row = { ...(latest?.row ?? op.row), revision: expected + 1 };
      await localDB.operations.bulkDelete(related.map((o) => o.id));
      await localDB.records.put({
        key: recordKey(scope, op.table, row.id),
        scope,
        table: op.table,
        row,
      });
      await localDB.operations.add({
        ...op,
        id: crypto.randomUUID(),
        queuedAt: Date.now(),
        row,
        expected,
        error: undefined,
        conflict: undefined,
      });
    }
    await readLocal();
    void flush();
  }
  async function backup() {
    const records = await localDB.records
      .where("scope")
      .equals(scope)
      .filter((r) => r.row.organization_id === org)
      .toArray();
    const operations = await localDB.operations
      .where("scope")
      .equals(scope)
      .toArray();
    download(
      JSON.stringify({
        format: "hbi-workspace-v1",
        scope,
        records: records.map(({ table, row }) => ({ table, row })),
        operations,
      }),
      `hbi-backup-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json",
    );
  }
  async function restore(file: File) {
    const data = parseWorkspaceBackup(
      JSON.parse(await file.text()),
      scope,
      org,
    );
    if (pending.length) throw new Error("Sync or export existing drafts first");
    await localDB.transaction(
      "rw",
      localDB.records,
      localDB.operations,
      async () => {
        for (const r of data.records) {
          const row = validateRow(r.table, r.row as Row);
          if (row.organization_id !== org)
            throw new Error("Organization mismatch");
          await localDB.records.put({
            key: recordKey(scope, r.table, row.id),
            scope,
            table: r.table,
            row,
          });
        }
        for (const op of data.operations) {
          const previous = await localDB.operations.get(op.id);
          if (previous && previous.scope !== scope)
            throw new Error(
              "Operation belongs to another account or organization",
            );
          await localDB.operations.put({ ...op, scope, row: op.row as Row });
        }
      },
    );
    await readLocal();
  }
  async function createOrg(name: string, slug: string) {
    const { error: e } = await client.current!.rpc("create_organization", {
      p_name: name,
      p_slug: slug,
    });
    if (e) throw new Error(e.message);
    window.location.reload();
  }
  const value: Context = {
    rows,
    org,
    user,
    role,
    orgs,
    lang,
    ready,
    online,
    error,
    pending,
    source,
    t: (ar, en) => (lang === "ar" ? ar : en),
    list: (table) => rows[table] ?? [],
    save,
    direct,
    substitute,
    selectOrg: (id) => {
      identity.current = "";
      rowsRef.current = {};
      setRows({});
      setPending([]);
      setReady(false);
      setOrg(id);
      setRole(s(orgs.find((o) => o.id === id)?.role));
    },
    setLang,
    reload,
    flush,
    resolve,
    backup,
    restore,
    createOrg,
    logout: async () => {
      identity.current = "";
      rowsRef.current = {};
      setRows({});
      setPending([]);
      setUser("");
      setOrg("");
      await client.current?.auth.signOut({ scope: "local" });
      router.replace("/login");
    },
  };
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
export function download(data: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
