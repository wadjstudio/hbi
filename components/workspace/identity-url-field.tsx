"use client";
import { useId, useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { IdentityImage } from "@/components/brand/identity-image";
import { identityImageSource } from "@/lib/brand/identity-image";
import { useWorkspace } from "./provider";

export const IdentityUrlField = ({
  label,
  value,
  onChange,
  isDisabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  isDisabled?: boolean;
}) => {
  const w = useWorkspace();
  const hint = useId();
  const [preview, setPreview] = useState(value);
  const isValid = Boolean(identityImageSource(value));
  return (
    <span className="identity-url-field" data-slot="identity-url-field">
      <input
        type="text"
        inputMode="url"
        autoComplete="off"
        aria-label={label}
        aria-describedby={hint}
        value={value}
        maxLength={8192}
        disabled={isDisabled}
        onChange={(event) => onChange(event.target.value)}
      />
      <small id={hint}>
        {w.t(
          "صورة اختيارية برابط HTTPS أو مسار داخل التطبيق. عند غيابها تظهر الهوية المحايدة.",
          "Optional HTTPS image or app-relative path. Missing images use a neutral identity.",
        )}
      </small>
      <button
        type="button"
        disabled={!isValid || isDisabled}
        onClick={() => setPreview(value)}
      >
        {w.t("معاينة الصورة", "Preview image")}
      </button>
      {preview === value && isValid && (
        <span className="identity-url-preview" aria-hidden="true">
          <IdentityImage
            src={preview}
            alt=""
            width={64}
            height={64}
            fallback={<ImageIcon size={32} />}
          />
        </span>
      )}
    </span>
  );
};
