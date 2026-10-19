import Image from "next/image";
import { brand } from "@/lib/brand";
import { IdentityImage } from "./identity-image";

export function BrandLockup({ className = "" }: { className?: string }) {
  return (
    <span className={`sesen-lockup ${className}`} dir="ltr">
      <Image
        src={brand.lockup}
        width={768}
        height={163}
        alt="SESEN — Sports Intelligence"
        unoptimized
        priority
      />
    </span>
  );
}

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <Image
      src={brand.mark}
      width={size}
      height={size}
      alt=""
      aria-hidden="true"
      unoptimized
    />
  );
}

export function PlayerAvatar({
  number,
  photoUrl,
}: {
  number: string;
  photoUrl?: string | null;
}) {
  return (
    <span className="sesen-player-avatar" aria-hidden="true">
      <IdentityImage
        src={photoUrl}
        alt=""
        width={40}
        height={40}
        fallback={
          <Image
            src={brand.playerPlaceholder}
            width={40}
            height={40}
            alt=""
            unoptimized
          />
        }
      />
      <b>{number || "?"}</b>
    </span>
  );
}
