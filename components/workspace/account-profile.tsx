"use client";
import { useState } from "react";
import { useWorkspace } from "./provider";
import { Panel, Notice, useAction } from "./controls";
import { IdentityUrlField } from "./identity-url-field";

export const AccountProfile = () => {
  const w = useWorkspace();
  const action = useAction();
  const [name, setName] = useState(w.account.name);
  const [photo, setPhoto] = useState(w.account.avatarUrl ?? "");
  const [isSaved, setIsSaved] = useState(false);
  return (
    <Panel title={w.t("الملف الشخصي للحساب", "Account profile")}>
      <form
        className="editor"
        data-slot="account-profile"
        onSubmit={(event) => {
          event.preventDefault();
          setIsSaved(false);
          void action.run(async () => {
            await w.updateProfile(name, photo);
            setIsSaved(true);
          });
        }}
      >
        <label>
          {w.t("اسم العرض", "Display name")}
          <input
            required
            maxLength={80}
            value={name}
            disabled={action.busy}
            onChange={(event) => {
              setName(event.target.value);
              setIsSaved(false);
            }}
          />
        </label>
        <div className="identity-field">
          <span>{w.t("رابط صورة الحساب", "Account photo URL")}</span>
          <IdentityUrlField
            label={w.t("رابط صورة الحساب", "Account photo URL")}
            value={photo}
            isDisabled={action.busy}
            onChange={(value) => {
              setPhoto(value);
              setIsSaved(false);
            }}
          />
        </div>
        {!w.online && (
          <p>
            {w.t(
              "تعديل الملف الشخصي يحتاج اتصالًا.",
              "Profile changes need a connection.",
            )}
          </p>
        )}
        {action.error && <Notice>{action.error}</Notice>}
        {isSaved && (
          <p role="status">{w.t("حُفظ الملف الشخصي.", "Profile saved.")}</p>
        )}
        <button type="submit" disabled={!w.online || !w.user || action.busy}>
          {w.t("حفظ الملف الشخصي", "Save profile")}
        </button>
      </form>
    </Panel>
  );
};
