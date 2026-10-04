"use client";
import type { Database } from "@/lib/supabase/database.types";
import { useState } from "react";
import { useWorkspace } from "./provider";
import { TagTemplates } from "./tag-template";
import { Entities } from "./entities";
import { Panel, Notice, useAction } from "./controls";
import { s } from "@/types/workspace";
export function Settings() {
  const w = useWorkspace(),
    a = useAction();
  const [category, setCategory] = useState("attack_action"),
    [code, setCode] = useState(""),
    [ar, setAr] = useState(""),
    [en, setEn] = useState(""),
    [userId, setUserId] = useState(""),
    [role, setRole] =
      useState<
        Database["public"]["Tables"]["organization_members"]["Row"]["role"]
      >("analyst");
  return (
    <>
      <Entities table="teams" title={w.t("الفرق", "Teams")} />
      <Entities table="seasons" title={w.t("المواسم", "Seasons")} />
      <Entities table="competitions" title={w.t("البطولات", "Competitions")} />
      <Panel title={w.t("قاموس التكتيكات", "Tactical taxonomy")}>
        <form
          className="editor form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            void a.run(() =>
              w.direct("tactical_terms", {
                category,
                code,
                label_ar: ar,
                label_en: en,
              }),
            );
          }}
        >
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {[
              "phase",
              "formation",
              "attack_action",
              "defense_system",
              "defense_behavior",
              "shot_type",
            ].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            aria-label="Code"
            required
            placeholder="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <input
            required
            aria-label="Arabic label"
            placeholder="العربية"
            value={ar}
            onChange={(e) => setAr(e.target.value)}
          />
          <input
            required
            aria-label="English label"
            placeholder="English"
            value={en}
            onChange={(e) => setEn(e.target.value)}
          />
          <button>{w.t("إضافة مصطلح", "Add term")}</button>
        </form>
        <div className="term-list">
          {w.list("tactical_terms").map((r) => (
            <span key={r.id}>
              {s(w.lang === "ar" ? r.label_ar : r.label_en)}{" "}
              {r.organization_id && (
                <button
                  onClick={() =>
                    void a.run(() =>
                      w.direct("tactical_terms", {
                        ...r,
                        archived: !r.archived,
                      }),
                    )
                  }
                >
                  {r.archived
                    ? w.t("تفعيل", "Restore")
                    : w.t("أرشفة", "Archive")}
                </button>
              )}
            </span>
          ))}
        </div>
      </Panel>
      <TagTemplates />
      {w.role === "owner" && (
        <Panel title={w.t("تعيين عضو موجود", "Assign existing user")}>
          <Notice>
            {w.t(
              "معرّف مستخدم Supabase مسجل بالفعل. لا يتم إرسال دعوة بريدية.",
              "Provide an existing Supabase user UUID. This does not send an email invitation.",
            )}
          </Notice>
          <form
            className="editor form-grid"
            onSubmit={(e) => {
              e.preventDefault();
              void a.run(async () => {
                const { createClient } = await import("@/lib/supabase/client");
                const { error } = await createClient()
                  .from("organization_members")
                  .upsert({ organization_id: w.org, user_id: userId, role });
                if (error) throw new Error(error.message);
              });
            }}
          >
            <input
              required
              aria-label="User UUID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <select
              value={role}
              onChange={(e) =>
                setRole(
                  e.target
                    .value as Database["public"]["Tables"]["organization_members"]["Row"]["role"],
                )
              }
            >
              {[
                "technical_director",
                "head_coach",
                "assistant_coach",
                "analyst",
                "viewer",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            <button>{w.t("تعيين الدور", "Assign role")}</button>
          </form>
        </Panel>
      )}
      {a.error && <Notice>{a.error}</Notice>}
    </>
  );
}
