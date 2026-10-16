"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Settings2, X } from "lucide-react";
import { canWrite } from "@/lib/permissions/roles";
import { useWorkspace } from "./provider";

export const VideoSourceSettings = ({
  layoutControls,
  isLinked,
  isReference,
  isBusy,
  onFile,
  onOnline,
}: {
  layoutControls: ReactNode;
  isLinked: boolean;
  isReference: boolean;
  isBusy: boolean;
  onFile: (file: File) => void;
  onOnline: (url: string) => void;
}) => {
  const w = useWorkspace();
  const menu = useRef<HTMLDetailsElement>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const isOnlineDisabled = !w.online || isBusy || !canWrite(w.role, "videos");
  const close = () => {
    if (!menu.current) return;
    menu.current.open = false;
    menu.current.querySelector("summary")?.focus();
  };
  useEffect(() => {
    const dismiss = (event: PointerEvent) => {
      if (
        menu.current &&
        event.target instanceof Node &&
        !menu.current.contains(event.target)
      )
        menu.current.open = false;
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, []);
  return (
    <details
      ref={menu}
      className="video-settings"
      data-slot="video-settings"
      dir={w.lang === "ar" ? "rtl" : "ltr"}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          close();
        }
      }}
    >
      <summary
        aria-label={w.t("إعدادات الفيديو", "Video settings")}
        title={w.t("إعدادات الفيديو", "Video settings")}
      >
        <Settings2 size={18} aria-hidden="true" />
      </summary>
      <div className="video-settings-popover">
        <header>
          <h3>{w.t("إعداد الفيديو والعرض", "Video & workspace setup")}</h3>
          <button
            type="button"
            onClick={close}
            aria-label={w.t("إغلاق إعدادات الفيديو", "Close video settings")}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        {layoutControls}
        <label className="file-button">
          {isLinked
            ? w.t("إعادة ربط", "Relink")
            : w.t("اختيار فيديو محلي", "Select local video")}
          <input
            type="file"
            accept="video/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onFile(file);
            }}
          />
        </label>
        <small>
          {w.t(
            "الفيديو المحلي يبقى على جهازك. إعادة الربط تتحقق من الملف قبل استخدام التحليل المحفوظ.",
            "Local video stays on your device. Relinking verifies the file before using saved analysis.",
          )}
        </small>
        <details className="source-options">
          <summary>
            {w.t(
              "مصادر الفيديو · محلي / YouTube",
              "Video sources · local / YouTube",
            )}
          </summary>
          <div className="online-source-picker">
            {isReference && (
              <button
                disabled={isOnlineDisabled}
                onClick={() =>
                  onOnline("https://www.youtube.com/watch?v=q-_grNLweEE")
                }
              >
                {w.t(
                  "تحليل التسجيل الرسمي · YouTube",
                  "Analyze official recording · YouTube",
                )}
              </button>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                onOnline(sourceUrl);
              }}
            >
              <input
                type="url"
                required
                aria-label={w.t("رابط فيديو YouTube", "YouTube video URL")}
                placeholder="https://www.youtube.com/watch?v=…"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
              />
              <button disabled={isOnlineDisabled}>
                {w.t("ربط المصدر", "Attach source")}
              </button>
            </form>
          </div>
        </details>
      </div>
    </details>
  );
};
