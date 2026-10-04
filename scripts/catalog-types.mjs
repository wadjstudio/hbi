// Types come from the migrated PostgreSQL catalog, including RPC arguments and FKs.
export async function generateTypes(db) {
  const columns = (
    await db.query(
      `select c.table_name,c.column_name,c.is_nullable,c.column_default,c.is_generated,c.udt_name,t.table_type from information_schema.columns c join information_schema.tables t on t.table_schema=c.table_schema and t.table_name=c.table_name where c.table_schema='public' order by c.table_name,c.ordinal_position`,
    )
  ).rows;
  const enums = (
    await db.query(
      `select t.typname,array_agg(e.enumlabel order by e.enumsortorder) labels from pg_type t join pg_enum e on e.enumtypid=t.oid group by t.typname`,
    )
  ).rows;
  const foreignKeys = (
    await db.query(`select tab.relname table_name,fk.conname name,ref.relname referenced_table,
 array(select att.attname from unnest(fk.conkey) with ordinality x(attnum,ord) join pg_attribute att on att.attrelid=fk.conrelid and att.attnum=x.attnum order by x.ord) columns,
 array(select att.attname from unnest(fk.confkey) with ordinality x(attnum,ord) join pg_attribute att on att.attrelid=fk.confrelid and att.attnum=x.attnum order by x.ord) referenced_columns,
 exists(select 1 from pg_constraint u where u.conrelid=fk.conrelid and u.contype in ('p','u') and u.conkey=fk.conkey) one_to_one
 from pg_constraint fk join pg_class tab on tab.oid=fk.conrelid join pg_namespace ns on ns.oid=tab.relnamespace join pg_class ref on ref.oid=fk.confrelid where fk.contype='f' and ns.nspname='public'`)
  ).rows;
  const functions = (
    await db.query(`select p.proname name,p.pronargdefaults defaults,p.proretset setof,r.typname return_type,
 coalesce((select jsonb_agg(jsonb_build_object('name',p.proargnames[a.ord],'type',t.typname) order by a.ord) from unnest(p.proallargtypes) with ordinality a(oid,ord) join pg_type t on t.oid=a.oid where p.proargmodes[a.ord] in ('o','b','t')),'[]'::jsonb) outputs,
 coalesce((select jsonb_agg(jsonb_build_object('name',p.proargnames[a.ord],'type',t.typname) order by a.ord) from unnest(p.proargtypes::oid[]) with ordinality a(oid,ord) join pg_type t on t.oid=a.oid),'[]'::jsonb) args
 from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace join pg_type r on r.oid=p.prorettype where ns.nspname='public' and p.prokind='f' and not exists(select 1 from pg_depend d where d.classid='pg_proc'::regclass and d.objid=p.oid and d.deptype='e') order by p.proname`)
  ).rows;
  const enumMap = new Map(
    enums.map((e) => [
      e.typname,
      e.labels.map((v) => JSON.stringify(v)).join(" | "),
    ]),
  );
  function type(udt) {
    if (enumMap.has(udt)) return enumMap.get(udt);
    if (udt.startsWith("_")) return `(${type(udt.slice(1))})[]`;
    if (["int2", "int4", "int8", "float4", "float8", "numeric"].includes(udt))
      return "number";
    if (udt === "bool") return "boolean";
    if (["json", "jsonb"].includes(udt)) return "Json";
    if (udt === "void") return "undefined";
    if (udt === "trigger") return "unknown";
    return "string";
  }
  const q = JSON.stringify;
  let output = `// Generated from the migrated PostgreSQL catalog by scripts/catalog-types.mjs.\nexport type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\nexport type Database = { public: { Tables: {\n`;
  for (const name of [
    ...new Set(
      columns
        .filter((c) => c.table_type === "BASE TABLE")
        .map((c) => c.table_name),
    ),
  ]) {
    const cs = columns.filter((c) => c.table_name === name);
    output += `${q(name)}: { Row: {\n`;
    for (const c of cs)
      output += `${q(c.column_name)}: ${type(c.udt_name)}${c.is_nullable === "YES" ? " | null" : ""};\n`;
    output += "}; Insert: {\n";
    for (const c of cs)
      if (c.is_generated === "NEVER")
        output += `${q(c.column_name)}${c.is_nullable === "YES" || c.column_default ? "?" : ""}: ${type(c.udt_name)}${c.is_nullable === "YES" ? " | null" : ""};\n`;
    output += `}; Update: Partial<Database["public"]["Tables"][${q(name)}]["Insert"]>; Relationships: [\n`;
    for (const fk of foreignKeys.filter((f) => f.table_name === name))
      output += `{foreignKeyName:${q(fk.name)};columns:${q(fk.columns)};isOneToOne:${fk.one_to_one};referencedRelation:${q(fk.referenced_table)};referencedColumns:${q(fk.referenced_columns)};},\n`;
    output += "]; };\n";
  }
  output += "}; Views: {\n";
  for (const name of [
    ...new Set(
      columns.filter((c) => c.table_type === "VIEW").map((c) => c.table_name),
    ),
  ]) {
    output += `${q(name)}: {Row:{`;
    for (const c of columns.filter((c) => c.table_name === name))
      output += `${q(c.column_name)}:${type(c.udt_name)} | null;`;
    output += "};Relationships:[];};\n";
  }
  output += "}; Functions: {\n";
  for (const f of functions.filter((f) => f.return_type !== "trigger")) {
    output += `${q(f.name)}:{Args:{`;
    for (const [i, arg] of f.args.entries())
      output += `${q(arg.name || `arg${i}`)}${i >= f.args.length - f.defaults ? "?" : ""}:${type(arg.type)};`;
    const returns = f.outputs.length
      ? "{" +
        f.outputs.map((arg) => `${q(arg.name)}:${type(arg.type)};`).join("") +
        "}"
      : type(f.return_type);
    output += `};Returns:${returns}${f.setof ? "[]" : ""};};\n`;
  }
  output += "}; Enums: {\n";
  for (const [name, t] of enumMap) output += `${q(name)}:${t};\n`;
  return output + "};CompositeTypes:Record<string,never>;};};\n";
}
