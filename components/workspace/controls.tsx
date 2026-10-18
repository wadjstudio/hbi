"use client";
import { useState, type ReactNode } from "react";
import { canWrite } from "@/lib/permissions/roles";
import { useWorkspace } from "./provider";
import { s, type Row, type Table } from "@/types/workspace";
export function Panel({
  title,
  children,
  actions,
  className = "",
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`hbi-panel panel ${className}`}>
      <header>
        <h2>{title}</h2>
        {actions}
      </header>
      {children}
    </section>
  );
}
export function Notice({ children }: { children: ReactNode }) {
  return <p className="notice">{children}</p>;
}
export function useAction() {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }
  return { error, busy, run };
}
export function SelectRow({
  label,
  value,
  onChange,
  rows,
  empty = true,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: Row[];
  empty?: boolean;
}) {
  return (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {empty && <option value="">—</option>}
        {rows.map((r) => (
          <option key={r.id} value={r.id}>
            {rowLabel(r)}
          </option>
        ))}
      </select>
    </label>
  );
}
export function rowLabel(r: Row) {
  return s(
    r.title ||
      r.name ||
      r.display_name ||
      [r.first_name, r.last_name].filter(Boolean).join(" ") ||
      r.label_en ||
      r.id.slice(0, 8),
  );
}
export type Field = {
  key: string;
  ar: string;
  en: string;
  type?: "number" | "date" | "datetime-local" | "textarea" | "checkbox";
  required?: boolean;
  table?: Table;
  options?: string[];
};
export function EntityEditor({
  table,
  fields,
  row,
  onDone,
  title,
}: {
  table: Table;
  fields: Field[];
  row?: Row;
  onDone?: () => void;
  title?: string;
}) {
  const w = useWorkspace(),
    a = useAction();
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(
      fields.map((f) => {
        if (f.type === "checkbox") return [f.key, Boolean(row?.[f.key])];
        const raw = s(
          row?.[f.key] ??
            (f.key === "status"
              ? "ready"
              : f.key === "dominant_hand"
                ? "unknown"
                : ""),
        );
        if (f.type === "datetime-local" && raw) {
          const parsed = new Date(raw);
          if (!Number.isNaN(parsed.getTime()))
            return [f.key, parsed.toISOString().slice(0, 16)];
        }
        return [f.key, raw];
      }),
    ),
  );
  return (
    <form
      className="editor"
      onSubmit={(e) => {
        e.preventDefault();
        void a.run(async () => {
          const input: Partial<Row> = { ...row };
          for (const f of fields) {
            const value = values[f.key];
            if (f.type === "number") {
              input[f.key] = value === "" ? null : Number(value);
            } else if (f.type === "checkbox") {
              input[f.key] = Boolean(value);
            } else if (f.type === "datetime-local") {
              const str = s(value).trim();
              if (!str) {
                input[f.key] = null;
              } else {
                const candidate =
                  /[zZ]|[+-]\d{2}:\d{2}$/.test(str)
                    ? str
                    : `${str.length === 16 ? `${str}:00` : str}Z`;
                const parsed = new Date(candidate);
                input[f.key] = Number.isNaN(parsed.getTime())
                  ? str
                  : parsed.toISOString();
              }
            } else {
              input[f.key] = value || null;
            }
          }
          await w.save(table, input);
          onDone?.();
        });
      }}
    >
      {title && <h3>{title}</h3>}
      <div className="form-grid">
        {fields.map((f) => (
          <label key={f.key}>
            {w.t(f.ar, f.en)}
            {f.table ? (
              <select
                aria-label={w.t(f.ar, f.en)}
                required={f.required}
                value={s(values[f.key])}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
              >
                <option value="">—</option>
                {w.list(f.table).map((r) => (
                  <option key={r.id} value={r.id}>
                    {rowLabel(r)}
                  </option>
                ))}
              </select>
            ) : f.options ? (
              <select
                aria-label={w.t(f.ar, f.en)}
                required={f.required}
                value={s(values[f.key])}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
              >
                <option value="">—</option>
                {f.options.map((o) => (
                  <option key={o}>{o}</option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                value={s(values[f.key])}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [f.key]: e.target.value }))
                }
              />
            ) : (
              <input
                type={f.type ?? "text"}
                required={f.required}
                min={f.type === "number" ? 0 : undefined}
                checked={
                  f.type === "checkbox" ? Boolean(values[f.key]) : undefined
                }
                value={f.type === "checkbox" ? undefined : s(values[f.key])}
                onChange={(e) =>
                  setValues((v) => ({
                    ...v,
                    [f.key]:
                      f.type === "checkbox" ? e.target.checked : e.target.value,
                  }))
                }
              />
            )}
          </label>
        ))}
      </div>
      {a.error && <Notice>{a.error}</Notice>}
      <button disabled={a.busy || !canWrite(w.role, table)} className="primary">
        {w.t("حفظ", "Save")}
      </button>
    </form>
  );
}
