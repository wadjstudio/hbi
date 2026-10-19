"use client";
import Image from "next/image";
import {
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { identityImageSource } from "@/lib/brand/identity-image";

type IdentityImageProps = Pick<
  ComponentProps<typeof Image>,
  "alt" | "width" | "height" | "className" | "loading"
> & {
  src?: string | null;
  fallback: ReactNode;
};
export const IdentityImage = ({
  src,
  fallback,
  alt,
  width = 40,
  height = 40,
  className = "",
  loading = "lazy",
}: IdentityImageProps) => {
  const source = identityImageSource(src);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  useEffect(() => {
    if (!failedSource) return;
    const retry = () => setFailedSource(null);
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [failedSource]);
  if (!source || source === failedSource) return fallback;
  return (
    <Image
      key={source}
      data-slot="identity-image"
      className={`identity-photo ${className}`}
      src={source}
      alt={alt}
      width={width}
      height={height}
      loading={loading}
      referrerPolicy="no-referrer"
      unoptimized
      onError={() => setFailedSource(source)}
    />
  );
};
