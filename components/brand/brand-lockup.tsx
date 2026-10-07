import Image from "next/image";
import { brand } from "@/lib/brand";

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

export function PlayerAvatar({ number }: { number: string }) {
  return (
    <span className="sesen-player-avatar" aria-hidden="true">
      <Image
        src={brand.playerPlaceholder}
        width={40}
        height={40}
        alt=""
        unoptimized
      />
      <b>{number || "?"}</b>
    </span>
  );
}
