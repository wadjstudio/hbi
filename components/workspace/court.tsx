"use client";
import { brand } from "@/lib/brand";
import type { ReactNode } from "react";
export const Court = ({
  children,
  onClick,
}: {
  children?: ReactNode;
  onClick?: (x: number, y: number) => void;
}) => (
  <svg
    className="court"
    viewBox="0 0 1000 500"
    role="group"
    aria-label="Handball court"
    onClick={(e) => {
      const r = e.currentTarget.getBoundingClientRect();
      const scale = Math.min(r.width / 1000, r.height / 500);
      onClick?.(
        Math.max(
          0,
          Math.min(
            1,
            (e.clientX - r.left - (r.width - 1000 * scale) / 2) /
              (1000 * scale),
          ),
        ),
        Math.max(
          0,
          Math.min(
            1,
            (e.clientY - r.top - (r.height - 500 * scale) / 2) / (500 * scale),
          ),
        ),
      );
    }}
  >
    <image href={brand.court} x="-30" y="-10" width="1060" height="520" />
    {children}
  </svg>
);
